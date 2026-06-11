# 통합 공유 목록 + 코드 Revoke 설계

날짜: 2026-06-11
대상 레포: 프론트 `share-anything-web`, 백엔드 `../share-anything` (Rust/Axum)

## 1. 목표

업로드 기록을 **서버 업로드 + 로컬(익명) 공유를 하나로 병합**해 시간순(최신 위)으로 보여주고, **삭제 시 해당 공유 코드를 revoke** 하여 서버/로컬 양쪽에서 더 이상 다운로드되지 않게 한다. 삭제는 **Undo 토스트** 방식으로, 사용자가 Undo를 누르지 않고 토스트가 사라질 때 실제로 커밋된다.

표시 위치: **홈의 '최근 공유' 박스(RecentShares)** 와 **`/history` 페이지** 둘 다.

## 2. 확정된 결정

- 표시 위치: 둘 다 (홈 박스 + /history).
- 익명(비로그인) 공유 revoke: **디바이스 귀속** — 업로드 시 `device_id` 저장, 요청의 `X-Device-Id`가 일치할 때만 revoke 허용.
- 삭제 UX: 확인 다이얼로그 없음. **낙관적 삭제 + Undo 토스트.** 실제 삭제는 토스트가 자연 소멸할 때(=Undo 미클릭) 커밋.
- 이 변경 이전에 생성된 익명 공유(`device_id` 없음)는 **고려하지 않음** (파일은 서버에 최대 1일만 보관되므로 관련 처리/코드 없음).

## 3. 공통 데이터 레이어

두 화면이 동일한 병합/삭제 로직을 쓰도록 단일 소스로 통일한다.

`src/hooks/useShareList.ts` (신규):
- 로컬 `listSessions()` + (인증 시) 서버 `userAPI.getUploads()` 를 가져온다.
- **`share_code` 기준 병합·중복 제거**, `createdAt` 내림차순 정렬.
- 반환: `items`(병합 목록), `loading`, `refresh()`, `requestDelete(code)`(Undo 토스트 포함 삭제 흐름).
- 낙관적 숨김: 내부 `pendingCodes`(삭제 대기) 집합으로 `items`에서 즉시 제외.

병합 시 source 판정:
- 로그인 중 업로드 → 로컬·서버 양쪽 존재 → 한 항목(`source: 'both'`).
- 로그인 전 익명 공유(이 브라우저) → 서버 history 미포함 → `source: 'local'`.
- 다른 기기에서 로그인 중 업로드 → `source: 'server'`.

병합 항목 형태:
```
{ code, fileNames: string[], totalSize, createdAt, expiresAt, expired, source }
```
삭제는 항상 `code` 기준이므로 서버 file id는 필요 없다.

## 4. 백엔드 변경 (`../share-anything`)

1. **마이그레이션**: `file_shares` 에 `device_id VARCHAR(64) NULL` 컬럼 추가 (기존 마이그레이션 네이밍 규칙 준수).
2. **업로드 공유 생성 시 device_id 저장**: 일반(서버) 업로드로 `file_shares` row가 생성되는 핸들러에서 요청의 `X-Device-Id` 를 `device_id` 에 저장. (P2P/QuickAccess 경로는 대상 아님.)
3. **신규 엔드포인트** `DELETE /shares/{code}` (인증 선택, optional auth):
   - 인가: `(인증됨 && claims.sub == share.user_id)` **또는** `(요청 X-Device-Id == share.device_id)`. 둘 다 아니면 403. 매칭되는 공유가 없으면 404.
   - 동작: 해당 `share_code` 의 모든 `file_shares` 행을 **hard delete** (기존 삭제 방식과 동일) + 스토리지 객체 삭제 + share_code 풀 반환.
   - 결과: 다운로드 핸들러가 자동으로 차단(레코드 없음 → not found).
   - 보안: `device_id` 는 localStorage의 무작위 UUID로 비공개·추측 불가. 코드만 아는 외부인은 막힘.

## 5. 토스트 Undo 메커니즘

현재 토스트(`ToastContext` / `Toast.tsx`)는 액션 버튼이 없고 ~2700ms 자동 닫힘. 다음을 추가한다.

`ToastContext` 확장:
- `Toast` 에 옵션 필드 추가: `actionLabel?`, `onAction?`(Undo 콜백), `onAutoClose?`(자연 소멸 시 커밋 콜백), `duration?`.
- `addToast(type, message, options?)` 가 옵션을 받도록 확장(기존 호출 형태 호환).
- 전역 헬퍼에 `toast.action(message, { type?, actionLabel, onAction, onAutoClose, duration })` 추가.

`Toast.tsx` 확장:
- `actionLabel` 이 있으면 메시지 오른쪽에 **라운드 버튼** 렌더.
  - 스타일: 토스트와 같은 라운드(pill), `bg-foreground text-background` → **라이트=검정 배경/흰 글자, 다크=흰 배경/검정 글자.**
  - 클릭: `stopPropagation` → `undone=true` 표시 → `onAction()` 실행(복원) → 토스트 닫기.
- **커밋 시점**: 토스트가 자연 소멸(타이머/본문 클릭/스와이프/force-dismiss)할 때 `undone` 이 아니면 `onAutoClose()` 1회 호출 후 제거.
- `duration` 옵션으로 자동 닫힘 시간 조정(Undo 토스트는 더 길게, 예: 5000ms).

## 6. 프론트엔드 변경

- `src/utils/recentSessions.ts`: `removeSession(code)` 추가.
- `src/services/api.ts`: `fileAPI.revokeShare(code)` → `DELETE /shares/{code}`.
- `src/hooks/useShareList.ts`(신규): §3. `requestDelete(code)` 흐름:
  1. `pendingCodes` 에 추가(목록에서 즉시 숨김).
  2. `toast.action('삭제되었습니다', { actionLabel: '실행취소', onAction: 복원, onAutoClose: 커밋, duration: 5000 })`.
  3. `onAction`(Undo): `pendingCodes` 에서 제거 → 항목 복원.
  4. `onAutoClose`(커밋): `fileAPI.revokeShare(code)` → 성공/404 시 `removeSession(code)` → `pendingCodes` 정리 → 목록 갱신.
- `src/components/UnifiedFileBox/RecentShares.tsx`: `useShareList` 사용. 각 행에 **휴지통 버튼** 추가(복사/펼침 옆). 인증 시 서버 첫 페이지(최근 N개)만 가져와 로컬과 병합(박스는 경량 "최근" 뷰).
- `src/pages/UploadHistoryPage.tsx`(+ history/*): 서버 그룹 목록에 **로컬 전용(익명) 공유를 시간순 병합**(코드 중복 제거). 로컬 항목은 수가 적고(≤10) 최신이므로 **첫 페이지에 시간순으로 끼워 넣고**, 이후 페이지는 서버 전용 유지. 그룹 삭제를 `requestDelete(code)` 로 연결. 로컬 전용 항목은 다운로드 로그가 없다(서버 메타 부재) — UI에서 자연스럽게 빈 상태.

## 7. i18n

신규 문자열(5개 로케일 ko/en/ja/zh-CN/zh-TW):
- 삭제 토스트 메시지(예: "삭제되었습니다").
- Undo 버튼 라벨(예: "실행취소").
- (필요 시) revoke 실패 토스트.

## 8. 엣지 케이스 / Out of scope

- 만료된 항목 삭제: 서버 호출 404는 무시하고 로컬만 제거.
- 동일 코드 연속 삭제/빠른 Undo: `pendingCodes` 와 토스트 1회 커밋 보장(`committed` 가드)으로 중복 커밋 방지.
- **Out of scope**: 변경 이전 익명 공유의 revoke(코드 없음), P2P 공유(애초에 recentSessions 미포함), soft-delete/상태 컬럼(기존대로 hard delete 유지).

## 9. 검증 계획

- 백엔드: `cargo build` 성공, 마이그레이션 적용 확인.
- 프론트: `tsc --noEmit` 통과.
- Playwright(로컬 dev): 
  - 홈 박스에서 항목 삭제 → 즉시 사라짐 + Undo 토스트(라이트/다크 버튼 색 확인) → Undo 시 복원, 미클릭 시 커밋.
  - 병합/정렬: 로컬+서버 항목이 시간순으로 섞여 표시(가능 범위에서 mock).
  - 모바일 폭에서 휴지통 추가 후 레이아웃 깨짐 없음.
