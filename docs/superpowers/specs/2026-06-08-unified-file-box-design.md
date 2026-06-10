# Unified File Box — 홈페이지 통합 박스 + 세션 토큰 + 기본 만료시간 설계

- **작성일**: 2026-06-08
- **저장소**: `share-anything-web` (프론트), `../share-anything` (백엔드, Rust/Axum)
- **상태**: 디자인 승인 대기

## 1. 목표

홈 화면 진입 즉시 파일을 드롭하면 자동으로 업로드되고, 6자리 코드 입력으로 다운로드까지 한 박스에서 끝나는 경험을 만든다. 동시에 사이트 전반의 Turnstile UI를 사용자 시야에서 제거하고, 사용자가 기본 만료시간을 자기 설정으로 둘 수 있게 한다.

### 결정 사항 요약
- 홈의 기존 업로드/다운로드 2카드를 **단일 `UnifiedFileBox`** 로 교체. **`QuickAccess` 는 그대로 유지** (위에 배치).
- 박스 상단 헤더는 박스 폭 전체를 차지하는 **2칸 탭**(`업로드` / `다운로드`). 활성 칸은 **밑변 primary 색 underline** 으로 표시.
- 업로드 모드에서 **활성 라벨 옆 `›`(ChevronRightIcon)** 클릭 시 기존 `/upload` 상세 페이지로 이동.
- 파일 드롭/선택 즉시 자동 업로드 시작. 완료 시 박스 안 인라인 성공 뷰 → `확인` → 인라인 최근 공유 목록.
- 새 파일 드롭은 어느 상태에서든 진행 중 작업을 abort 하고 즉시 새 세션 시작.
- 다운로드 모드는 6자리 입력 → `/download/{code}` 라우팅(기존 동작).
- **기본 만료시간 30분**. `users.default_expiration` 컬럼을 신설하여 사용자 설정에 노출. 박스에서 업로드 시 `expiration` 미전송 → 백엔드가 사용자 설정(또는 30분 fallback) 사용.
- **세션 토큰 모델로 전면 이전**. 사이트 진입 시 invisible Turnstile 1회 검증 → `POST /auth/session-token` → 단명 JWT 발급 → 모든 변형 요청에 `X-Session-Token` 헤더 첨부. **매 API 마다 turnstile_token 받던 기존 패턴은 정석적으로 폐기**.
- `/upload`·`/download` 등 사이트 내부에서 노출되던 모든 Turnstile 위젯 UI 삭제.

## 2. 박스 상태 머신

### 모드(orthogonal)
- `mode: 'upload' | 'download'` — 기본 `'upload'`. 업로드 진행 중에는 두 탭 모두 disabled.

### 상태
```
mode=upload                       mode=download

  IdleUpload (드롭존)                IdleDownload (6자리 입력)
       │ drop                            │ valid code
       ▼                                 ▼
  Uploading (진행률)               navigate('/download/{code}')
       │ complete
       ▼
  UploadSuccess (코드+복사+확인)
       │ 확인
       ▼
  RecentSessions (인라인 리스트)
```

### 전이 규칙
| 출발 | 이벤트 | 도착 | 비고 |
|---|---|---|---|
| `IdleUpload` | 파일 드롭/선택 | `Uploading` | 즉시 시작 |
| `IdleUpload` | 다운로드 탭 | `IdleDownload` | mode 전환 |
| `Uploading` | 전체 완료 | `UploadSuccess` | `recentSessions`에 푸시 |
| `Uploading` | 일부 실패 | `UploadSuccess` | 실패 파일은 본문 하단 빨간색 + "재시도" |
| `Uploading` | 전부 실패 | `IdleUpload` | 에러 토스트 |
| `Uploading` | 취소(X) | `IdleUpload` | abort + 토스트 |
| `Uploading` | **새 파일 드롭** | `Uploading`(재시작) | 진행 중 abort + 새 세션 |
| `Uploading` | 탭 클릭 | (무시) | 탭 disabled |
| `UploadSuccess` | 확인 | `RecentSessions` | |
| `UploadSuccess` | 새 파일 드롭 | `Uploading` | 즉시 새 세션 |
| `UploadSuccess` | 다운로드 탭 | `IdleDownload` | |
| `UploadSuccess` | "QR · 상세 보기" | `/upload/success` 로 이동 | state로 결과 전달 |
| `RecentSessions` | 새 파일 드롭 | `Uploading` | |
| `RecentSessions` | 다운로드 탭 | `IdleDownload` | |
| `RecentSessions` | 항목 클릭 | 공유 URL(`{origin}/download/{code}`) 클립보드 복사 + 토스트 | 상태 유지. QuickAccess 와 일관 |
| `RecentSessions` | "전체 보기 →" | `/history` 이동 | 인증 사용자만 노출 |
| `IdleDownload` | 6자리 + Enter/► | `navigate('/download/{code}')` | 박스 상태 미변경 |
| `IdleDownload` | 업로드 탭 | `IdleUpload` | 입력값 폐기 |
| any (업로드 모드) | "업로드" 탭 재클릭 또는 `›` | `navigate('/upload', { state: { initialFiles } })` | 박스에 파일 있으면 인계 |

### 엣지케이스
1. **새로고침 중 업로드 손실** — 진행 중 상태는 폐기(기존 UploadPage 의 sessionStorage 복원 패턴은 이 박스에 적용하지 않음). 완료된 세션은 `recentSessions` 에 남음.
2. **모드 전환 시 박스 상태 보존** — 다운로드로 갔다 업로드로 돌아오면 마지막 업로드 모드 상태(`RecentSessions` 등) 그대로.
3. **부분 실패 후 재시도** — 단순화를 위해 **새 share_code** 발급(기존 코드에 합치지 않음).
4. **"›" 어포던스** — 업로드 모드에서만 노출. 다운로드는 상세 페이지가 없어 비대칭 의도.

## 3. 컴포넌트/모듈 변경 목록

### 프론트 신규
| 파일 | 책임 |
|---|---|
| `src/hooks/useMultipartUpload.ts` | 멀티파트 업로드 파이프라인을 순수 훅으로 추출. `QuickAccessUploadContext`, `UnifiedFileBox` 양쪽에서 사용 |
| `src/context/SessionTokenContext.tsx` | invisible Turnstile → `/auth/session-token` → 토큰 캐싱 + 자동 갱신 |
| `src/utils/recentSessions.ts` | localStorage 기반 최근 공유 세션 10건 LRU 관리 |
| `src/components/UnifiedFileBox/index.tsx` | 박스 컨테이너 + state machine 호스트 |
| `src/components/UnifiedFileBox/useUnifiedFileBoxState.ts` | reducer (섹션 2 전이 규칙 그대로 구현) |
| `src/components/UnifiedFileBox/ModeHeader.tsx` | 2칸 탭 헤더 (밑변 underline 활성표시 + `›` 어포던스) |
| `src/components/UnifiedFileBox/IdleUpload.tsx` | 드롭존 + 기본 만료 안내 |
| `src/components/UnifiedFileBox/IdleDownload.tsx` | 6자리 코드 입력 |
| `src/components/UnifiedFileBox/Uploading.tsx` | 진행률 행(QuickAccess 패턴 재사용) |
| `src/components/UnifiedFileBox/UploadSuccess.tsx` | 공유 코드 + 복사 + 확인 + QR/상세 보기 |
| `src/components/UnifiedFileBox/RecentSessions.tsx` | 최근 공유 인라인 리스트 |

### 프론트 변경
| 파일 | 변경 |
|---|---|
| `src/App.tsx` | `<SessionTokenProvider>` 로 라우트 트리 래핑 |
| `src/pages/HomePage.tsx` | 기존 2카드 grid 제거, `<UnifiedFileBox />` 삽입. QuickAccess 는 유지 |
| `src/pages/SettingsPage.tsx` | "기본 만료시간" select 추가 (알림 섹션 옆 또는 별도 섹션) |
| `src/pages/UploadPage.tsx` | location.state.initialFiles 수용(기존 fallbackFiles 일반화). Turnstile 상태·핸들러 모두 제거 |
| `src/pages/upload/UploadProgressBar.tsx` | TurnstileWidget 렌더 + 관련 prop 제거 |
| `src/pages/DownloadFilePage.tsx` | Turnstile 호출·상태 제거 |
| `src/context/QuickAccessUploadContext.tsx` | 내부 업로드 로직을 `useMultipartUpload` 로 위임. 외부 동작 동일 |
| `src/services/api.ts` | request interceptor 에 `X-Session-Token` 첨부. 모든 호출에서 `turnstile_token`/`X-Turnstile-Token` 인자 제거. `userAPI.getSettings/updateSettings` 타입에 `default_expiration` 추가. `authAPI.exchangeSessionToken()` 신설 |
| `src/components/TurnstileWidget.tsx` | SessionTokenProvider 내부 전용으로 사용. import 정리 |
| `src/i18n/*.json` | 신규 키(섹션 7) 5개 언어 동시 추가 |

### 백엔드 변경 (`../share-anything`)
| 파일 | 변경 |
|---|---|
| `migrations/<timestamp>_add_default_expiration.sql` | `ALTER TABLE users ADD COLUMN default_expiration VARCHAR(32) NOT NULL DEFAULT 'thirty_minutes'` |
| `src/models/user.rs` | settings 응답/요청 구조체에 `default_expiration: ExpirationOption` 필드 추가 |
| `src/db/repository.rs` (현재 `:72` `get_user_notification_settings`, `:158` `update_user_notification_settings`) | SELECT/UPDATE 쿼리에 `default_expiration` 포함 |
| `src/handlers/user.rs` | get/update 핸들러 시그니처에 필드 노출 |
| `src/handlers/auth/session_token.rs` *(신규)* | `POST /auth/session-token` — body `{ turnstile_token }` → JWT 발급 `{ session_token, expires_at }` |
| `src/middleware/session_token.rs` *(신규)* | `X-Session-Token` 헤더 검증 미들웨어 |
| `src/routes.rs` | 신규 라우트 등록, 미들웨어 적용 |
| `src/models/upload.rs`, `src/models/file_share.rs` | `turnstile_token: String` 필드 **제거** (정석적 이전) |
| `src/handlers/presigned.rs`, `src/handlers/download.rs`, `src/handlers/upload.rs`, p2p 핸들러 | Turnstile 검증 호출 모두 제거. 세션 토큰 미들웨어가 대신 보호. `expiration` 미지정 시 인증 사용자의 `default_expiration` 또는 `thirty_minutes` fallback 적용 |
| `src/config.rs` `TurnstileConfig` | 검증 호출이 사라지더라도 토큰 발급 단계에서 여전히 필요하므로 유지. 단, 매 요청 검증 경로의 의존성은 제거 |
| `.env` 항목 | 필요 시 `SESSION_TOKEN_JWT_SECRET`, `SESSION_TOKEN_TTL_SECONDS` 추가. 사용자가 직접 설정 |

## 4. 데이터/API 흐름

### A. 세션 토큰 라이프사이클
```
App.tsx mount
   ↓ SessionTokenProvider
   ├─ Invisible TurnstileWidget mount (UI hidden)
   ├─ Widget → CF Turnstile challenge → turnstile_token
   ├─ POST /auth/session-token  { turnstile_token }
   │      ← { session_token: <JWT>, expires_at: ISO8601 }
   ├─ React state + sessionStorage 백업
   └─ (expires_at - 60s) 시점 자동 refresh
            ↳ TurnstileWidget.reset() → 새 토큰 → 새 session_token
```

axios `api` request interceptor:
- 기존 `Authorization: Bearer <userJWT>` 유지
- **신규**: 모든 요청에 `X-Session-Token: <session_token>` 첨부

Cloudflare Worker (`workerAPI`) 직접 호출은 변경 없음 — 백엔드 presigned URL 이 권한을 담음.

### B. 백엔드 검증 모델
- `src/middleware/session_token.rs`: `X-Session-Token` 헤더 → JWT 디코드 → `exp` 검증
- 인증 사용자(`Authorization: Bearer <userJWT>` 정상)는 세션 토큰 검사 면제 (둘 중 하나만 통과해도 OK)
- 실패 응답: `401` + body `{ code: "SESSION_TOKEN_REQUIRED" | "SESSION_TOKEN_EXPIRED" }`
- 라우트 적용: 기존에 turnstile_token 을 요구하던 모든 변형 라우트(`presigned.rs` 업로드 init/presign, `download.rs` 다운로드 메타/스트림, p2p 세션 생성 등)

### C. `default_expiration` 흐름
- 사용자 설정 GET/PUT 응답·요청에 `default_expiration: ExpirationOption` 추가
- `SettingsPage`에 select 추가, 변경 시 PUT
- `UnifiedFileBox` 업로드 init 시 `expiration` 필드 **미전송**
- 백엔드 도출 로직:
  ```
  if request.expiration is None:
      if user is authenticated:
          use user.default_expiration
      else:
          use 'thirty_minutes'
  else:
      use request.expiration
  ```
- `/upload` 상세 페이지는 기존대로 사용자가 명시 지정

### D. 박스 → `/upload` 상세 인계
```ts
navigate('/upload', {
  state: { initialFiles: filesInBox, fromUnifiedBox: true }
})
```
`UploadPage` 는 기존 `fallbackFiles` 패턴(`pages/UploadPage.tsx:43-44, 169-179`)을 일반화해 `initialFiles` 수용. 박스 업로드 진행 중에는 `›` disabled (이중 업로드 방지).

## 5. UI / 레이아웃

### 전체 배치
```
max-w-5xl mx-auto px-4
  QuickAccess (변경 없음)
  pt-8
  UnifiedFileBox (1단)
```

### 박스 골격
- 컨테이너: `bg-card border-[3px] border-foreground/[0.09] rounded-2xl overflow-hidden`
- 헤더 영역: 박스 폭 전체, 2칸. 각 칸은 `flex-1 py-3 text-center`
- 활성 칸: 라벨 진하게 + **밑변에 `border-b-2 border-primary`** underline. 비활성: `text-muted-foreground border-b-2 border-transparent`
- 헤더와 본문 사이 구분선: `border-t border-foreground/[0.09]`
- 활성 라벨 옆 chevron: 업로드 모드 활성 시 `<ChevronRightIcon className="w-4 h-4 ml-1 inline" />`

### 각 뷰

**IdleUpload**
- 중앙 정렬: `ArrowUpTrayIcon w-12 h-12 text-primary` + "파일을 드래그하거나 클릭해 선택" + "기본 만료 N분 · 변경/로그인해서 변경" 링크
- 인증 사용자의 N은 `settings.default_expiration`. 비인증은 항상 "30분".

**IdleDownload**
- 기존 `HomePage.tsx:81-115` 6자리 입력 위젯 그대로 추출해 재사용
- 단축키 `/` 포커스는 박스 mode 가 download 일 때만 작동
- Enter 또는 ► 클릭 → `navigate('/download/{code}')`

**Uploading**
- `QuickAccess.tsx:304-353` 진행률 행 마크업 재사용 (`FileThumbnail` + 파일명 + 진행률 바 + 남은 시간 + 취소 X)
- 다중 파일 시 각 행 누적

**UploadSuccess**
- 중앙 정렬: 체크 아이콘 + "업로드 완료"
- 공유 코드: `QuickAccess.tsx:401-466` share-bubble 글래스모피즘 스타일 재사용 (`var(--share-bubble-bg)`, blur(20px) saturate(180%))
- "N개 파일 · {duration} 후 만료" 서브텍스트
- 액션: `[확인]`(primary) + `[QR · 상세 보기 ↗]`(secondary link to `/upload/success`)
- 부분 실패 시 하단에 빨간색 실패 목록 + `[재시도]`

**RecentSessions**
- 헤더 행: "최근 공유" + 인증 사용자에게만 "전체 보기 →" (`/history`)
- 각 행: 썸네일 + 파일명(또는 "N개 파일") + 코드 + 남은 시간. 행 전체 클릭 시 **공유 URL** 복사 + 토스트
- 만료 항목은 회색 처리, 클릭 시 "만료된 코드입니다" 토스트
- 빈 상태: "아직 공유한 파일이 없어요"

### 반응형
- 박스 최소 높이: `≥ 380px` 데스크톱, `≥ 280px` 모바일
- 탭 헤더: 모바일에서도 2칸 50% 균등
- 6자리 입력: `text-base md:text-lg`

### 접근성
- 헤더 = `role="tablist"`, 각 탭 `role="tab" aria-selected`
- 본문 = `role="tabpanel"`. 모드 전환 시 새 패널 첫 포커스 가능 요소로 이동
- 6자리 입력 `aria-label="다운로드 코드"`
- 진행률 바 `role="progressbar" aria-valuenow`

## 6. 에러 처리

| 시나리오 | 동작 |
|---|---|
| 세션 토큰 발급 실패(부팅) | 3회 backoff 재시도 → 실패 확정 시 박스에 "보안 검증에 실패했어요. 새로고침해 주세요" 정적 안내 |
| 세션 토큰 만료(재발급 도중) | 정상 흐름은 `expires_at - 60s` 자동 refresh. 실패 시 401 발생 → response interceptor 가 1회 재발급 + 같은 요청 재시도. 그래도 실패 → 토스트 |
| 업로드 전부 실패 | 박스 → `IdleUpload`, 에러 토스트 |
| 업로드 일부 실패 | 박스 → `UploadSuccess`(성공 파일만 코드), 실패 목록 + 재시도. 재시도는 새 share_code |
| `/user/settings` PUT 실패 | select 값 롤백 + 토스트 "설정 저장에 실패했어요" |
| 다운로드 코드 형식 오류 | ► disabled 유지 |
| 존재하지 않는 코드 | `/download/{code}` 페이지가 기존대로 처리 |
| localStorage `recentSessions` 손상 | JSON parse 실패 시 빈 배열로 리셋(try/catch 격리) |

## 7. 비인증 사용자 + i18n

### 비인증 사용자
| 기능 | 인증 | 비인증 |
|---|---|---|
| 박스 노출 | ✓ | ✓ |
| 자동 업로드 | ✓ | ✓ (세션 토큰으로 보호) |
| 다중 파일 | ✓ | ✓ |
| `default_expiration` | 사용자 설정값 | 항상 30분(백엔드 fallback) |
| `default_expiration` 표시 라벨 | "기본 만료 N분 · 변경" | "기본 만료 30분 · 로그인해서 변경" |
| `RecentSessions` | localStorage 10건 + "전체 보기 →" | localStorage 10건만 |
| 비밀번호/원타임 옵션 | 박스 미노출(상세 페이지에서) | 박스 미노출 + 백엔드 인증 필요 (기존) |

박스 내부에는 로그인 유도 배너 없음 — QuickAccess 가 이미 그 역할.

### i18n 신규 키

`src/i18n/ko.json`(나머지 4개 언어 동일 구조로 추가):
```json
{
  "unifiedBox": {
    "tabUpload": "업로드",
    "tabDownload": "다운로드",
    "uploadHint": "파일을 드래그하거나 클릭해 선택",
    "downloadHint": "6자리 코드를 입력하세요",
    "defaultExpiration": "기본 만료 {duration}",
    "changeDefault": "변경",
    "loginToChange": "로그인해서 변경",
    "uploadComplete": "업로드 완료",
    "fileCountSummary": "{count}개 파일 · {duration} 후 만료",
    "confirmButton": "확인",
    "qrAndDetails": "QR · 상세 보기",
    "recentTitle": "최근 공유",
    "viewAll": "전체 보기",
    "recentEmpty": "아직 공유한 파일이 없어요",
    "expired": "만료",
    "remainingMinutes": "{minutes}분 남음",
    "retry": "재시도",
    "partialFailure": "{count}개 파일 업로드 실패",
    "expiredCodeToast": "만료된 코드입니다",
    "sessionTokenFailed": "보안 검증에 실패했어요. 새로고침해 주세요"
  },
  "settings": {
    "defaultExpirationLabel": "기본 만료시간",
    "defaultExpirationDescription": "홈 화면에서 빠른 업로드를 할 때 적용되는 기본 만료시간이에요",
    "defaultExpirationSaved": "기본 만료시간이 저장됐어요"
  }
}
```
누락 키 처리는 현행 i18n 의 fallback 동작을 따른다(구현 시 확인).

## 8. 단계적 출시

### Phase 1 — 백엔드 정석 이전 (Turnstile → 세션 토큰)

**원칙**: 백엔드 코드베이스를 깊이 탐구한 뒤, 매 요청에 `turnstile_token`을 받던 기존 패턴을 **정석적으로 폐기**한다. 호환을 위한 잔존 코드는 두지 않는다(사용자가 `.env`/설정을 갱신할 수 있다고 명시). 단, **굳이 바꿀 필요가 없는 것까지 일부러 손대지는 않는다**.

작업:
1. `migrations/<timestamp>_add_default_expiration.sql` 추가, `cargo sqlx prepare` 갱신
2. `src/models/user.rs`, `src/db/repository.rs`(`:72`/`:158` 두 함수), `src/handlers/user.rs` 에 `default_expiration: ExpirationOption` 노출
3. `src/handlers/auth/session_token.rs` (신규) — `POST /auth/session-token` body `{ turnstile_token }` → 검증 후 단명 JWT 발급. TTL 은 `.env` `SESSION_TOKEN_TTL_SECONDS`(기본 1800s, 검토 후 조정)
4. `src/middleware/session_token.rs` (신규) — `X-Session-Token` 헤더 검증. user JWT 통과 시 면제
5. `src/routes.rs` — 신규 라우트 등록 + 변형 라우트들에 미들웨어 적용
6. **`src/models/upload.rs:26`, `src/models/file_share.rs:175, 226` 등에서 `turnstile_token: String` 필드 제거**
7. `src/handlers/presigned.rs`, `src/handlers/download.rs`, `src/handlers/upload.rs`, p2p 세션 핸들러 — `verify_turnstile_token` 호출 모두 제거
8. 업로드 init 핸들러에 `expiration` 도출 로직 추가 (인증 사용자: `users.default_expiration`, 비인증: `thirty_minutes`)
9. `src/utils/turnstile.rs::verify_turnstile_token` 자체는 `auth/session_token.rs` 에서만 호출되도록 정리
10. `.env.example` 갱신 — `SESSION_TOKEN_JWT_SECRET`, `SESSION_TOKEN_TTL_SECONDS` 추가
11. 테스트: 신규 미들웨어 단위, `/auth/session-token` 핸들러 단위, settings round-trip, expiration fallback 통합

**롤백 안전성**: Phase 1 배포 직후 프론트는 여전히 turnstile_token 을 보냄. 이 시점에서 신규 미들웨어가 **세션 토큰 부재 시 401**을 반환하므로 사이트가 멈춘다. 따라서 **Phase 1 백엔드 배포와 Phase 2 프론트 배포를 같은 릴리스 윈도우 안에서 묶는다**(또는 일시적 환경 플래그 `ENFORCE_SESSION_TOKEN=false` 로 시작 → 프론트 배포 후 true). 환경 플래그 사용 여부는 운영 측에서 결정.

### Phase 2 — 프론트 보안 인프라
1. `src/context/SessionTokenContext.tsx` 추가, `App.tsx`에 `<SessionTokenProvider>` 래핑
2. `src/services/api.ts` request interceptor 에 `X-Session-Token` 자동 첨부, `authAPI.exchangeSessionToken()` 신설
3. 사이트 진입 후 모든 페이지(업로드, 다운로드, 설정 등) 정상 동작 확인

### Phase 3 — 통합 박스 + 기본 만료시간 UI
1. `src/hooks/useMultipartUpload.ts` 추출, `QuickAccessUploadContext` 위임 변경(외부 동작 동일)
2. `src/utils/recentSessions.ts`
3. `src/components/UnifiedFileBox/*` 전체 신설
4. `pages/HomePage.tsx` 2카드 제거 + `<UnifiedFileBox />`
5. `pages/SettingsPage.tsx` 기본 만료시간 select 추가
6. i18n 키 5개 파일 동시 갱신

### Phase 4 — 프론트 잔존 Turnstile UI 제거
1. `pages/UploadPage.tsx`, `pages/upload/UploadProgressBar.tsx`, `pages/DownloadFilePage.tsx` 에서 Turnstile 위젯/상태/prop 모두 삭제
2. `services/api.ts` 의 모든 호출에서 `turnstile_token`/`X-Turnstile-Token` 인자 제거
3. `components/TurnstileWidget.tsx` 는 `SessionTokenProvider` 내부 전용으로 유지

> Phase 1 에서 백엔드의 `turnstile_token` 필드가 이미 제거되었으므로, Phase 4 는 프론트의 기능적 잔재 정리에 가깝다.

## 9. 테스트

### 프론트 단위/통합
| 종류 | 대상 | 위치 |
|---|---|---|
| Reducer | `useUnifiedFileBoxState` — 섹션 2 전이 규칙 전수 | `src/components/UnifiedFileBox/__tests__/reducer.test.ts` |
| 훅 | `useMultipartUpload` — 정상/abort/부분 실패 (axios mock) | `src/hooks/__tests__/useMultipartUpload.test.ts` |
| 유틸 | `recentSessions` — push/LRU/만료 필터/손상 복구 | `src/utils/__tests__/recentSessions.test.ts` |
| 컨텍스트 | `SessionTokenContext` — 자동 refresh, 401 재시도 | `src/context/__tests__/SessionTokenContext.test.tsx` |
| 컴포넌트 | UnifiedFileBox golden path (드롭 → 진행률 → 성공 → 확인 → 최근 → 재드롭 → 모드 전환) | `src/components/UnifiedFileBox/__tests__/UnifiedFileBox.test.tsx` |
| 컴포넌트 | 업로드 중 탭 disabled | 위 파일 |

### 백엔드
| 종류 | 대상 |
|---|---|
| 단위 | `POST /auth/session-token` — Turnstile 성공/실패, 페이로드 검증 |
| 단위 | `session_token` 미들웨어 — 만료/위조/누락 401, 정상 통과, user JWT 면제 |
| 통합 | `presigned.rs` 업로드 init — 세션 토큰 통과, 토큰 없을 시 401 |
| 단위 | `/user/settings` GET/PUT — `default_expiration` round-trip |
| 통합 | 업로드 init `expiration` 누락 시 인증=사용자 설정, 비인증=30분 |

### 수동 검증 (verification-before-completion)
1. `npm run build` 타입 에러 0
2. `npm test` 통과
3. 인증 사용자 브라우저: 골든 패스(드롭 → 자동 업로드 → 확인 → 최근)
4. 비인증 사용자 브라우저: 동일 골든 패스 + 만료 라벨 "30분" 고정
5. 다운로드 모드: 유효 코드 → `/download/{code}` 진입
6. `/upload` 상세 페이지에서 Turnstile UI 사라졌고, 업로드 정상
7. SettingsPage 에서 기본 만료시간 변경 → 박스 라벨 동기화
8. 백엔드: `cargo build`, `sqlx migrate run`, `cargo test --all`

## 10. 관측성 & 마이그레이션 노트
- `SessionTokenProvider` 발급/만료/재시도 `console.warn`(DEV 전용)
- 401 응답에 `code` 필드(`SESSION_TOKEN_REQUIRED`/`SESSION_TOKEN_EXPIRED`)로 클라 분기 명확화
- `users.default_expiration` NOT NULL DEFAULT `'thirty_minutes'` — 기존 사용자 자동 30분
- localStorage `recentSessions` 는 첫 사용 시 빈 배열 자연 생성 — 별도 마이그레이션 없음

## 11. 오픈 이슈 / 후속 검토
- `ENFORCE_SESSION_TOKEN` 환경 플래그를 단기 도입할지(운영 측 결정)
- 세션 토큰 TTL 기본값 (1800s) 가 적절한지 — 자동 refresh 안정성과 보안 트레이드오프
- 박스 컨테이너 border 스타일: 현재 스펙은 실선(`border-[3px] border-foreground/[0.09]`). QuickAccess 가 점선이므로 시각 위계상 실선 유지가 자연스러우나, IdleUpload 가 드롭존인 만큼 점선 선호 시 결정 필요
- 부분 실패 후 재시도가 같은 share_code 에 합쳐지는 변형은 v2 검토
- 모바일 키보드에서 6자리 입력 UX 추가 검토 필요 시 별도 작업
