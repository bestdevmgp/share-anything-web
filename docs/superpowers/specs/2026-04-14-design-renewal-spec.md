# ShareAnything Design Renewal - Full Specification

## Overview

ShareAnything 웹 프로젝트의 전면 디자인 리뉴얼. CRA → Next.js 마이그레이션과 함께 UI를 modern dark SaaS 스타일(Vercel/Linear)로 전면 재설계한다. 기존 API 형식과 모든 기능은 100% 유지하며, 디자인 시스템과 페이지 레이아웃만 교체한다.

## Project Structure

```
~/Desktop/Dev/
├── share-anything-web-old/   ← 현재 프로젝트 (rename, 레퍼런스용)
└── share-anything-web/       ← 새 Next.js App Router 프로젝트
```

기존 프로젝트에서 그대로 복사해올 것:
- `src/services/api.ts` → API 서비스 레이어 (형식 변경 없음)
- `src/hooks/*` → useP2PUploader, useP2PDownloader, useThumbnail
- `src/context/*` → AuthContext, ThemeContext, LanguageContext, ToastContext, QuickAccessUploadContext
- `src/utils/*` → format, filePreview, hwpParser, webrtc, pdfWorkerSetup, uploadFileStorage, providerLogos
- `src/i18n/*` → 5개 언어 JSON + legal 페이지들
- `src/types/index.ts` → 타입 정의

---

## 1. Tech Stack

### Core
- **Next.js 15** (App Router, `'use client'` CSR 위주로 시작)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Radix UI** (기존 컴포넌트 프리미티브 유지)

### New Dependencies
- **motion** (v12, 구 framer-motion) - UI 애니메이션, page transitions, 마이크로인터랙션
- **Geist Mono** font - `geist/font/mono` (Next.js native 지원)
- **class-variance-authority** - 기존과 동일, variant 관리
- **clsx + tailwind-merge** - 기존과 동일

### Preserved Dependencies
- `react-dropzone` - 파일 드래그앤드롭
- `qrcode.react` / `qr-code-styling` - QR 코드 생성
- `react-pdf` / `pdfjs-dist` - PDF 미리보기
- `docx-preview` - DOCX 미리보기
- `xlsx` - Excel 파싱
- `jszip` / `pako` - ZIP/압축 처리
- `axios` - HTTP 클라이언트
- `lottie-react` - 404 애니메이션
- `@marsidev/react-turnstile` - Cloudflare CAPTCHA
- `@radix-ui/*` - UI 프리미티브 (11개)

### Removed Dependencies
- `react-router-dom` → Next.js App Router로 대체
- `react-scripts` / `react-app-rewired` → Next.js 빌드 시스템으로 대체
- `react-toastify` → 커스텀 Toast 유지 (새 디자인)
- `ScrollToTop` 컴포넌트 → Next.js App Router가 자동 처리
- `config-overrides.js` → Next.js webpack 설정으로 대체

---

## 2. Design System

### 2.1 Color Palette

#### Dark Mode (기본)
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#000000` | 페이지 배경 |
| `--surface` | `#0A0A0A` | 컨텐츠 영역 |
| `--card` | `#171717` | 카드, 패널 배경 |
| `--elevated` | `#262626` | 상위 레이어 요소 |
| `--primary` | `#00D4AA` | 주 액센트 (시안/틸) |
| `--primary-hover` | `#00E5BB` | primary hover 상태 |
| `--primary-foreground` | `#000000` | primary 위 텍스트 |
| `--accent` | `#00E5FF` | 보조 액센트 (밝은 시안) |
| `--foreground` | `#FAFAFA` | 기본 텍스트 |
| `--muted` | `#737373` | 보조 텍스트 |
| `--muted-foreground` | `#A3A3A3` | muted 상위 텍스트 |
| `--border` | `rgba(255,255,255,0.08)` | 기본 border |
| `--border-hover` | `rgba(255,255,255,0.15)` | hover border |
| `--destructive` | `#EF4444` | 삭제/위험 동작 |
| `--success` | `#22C55E` | 성공 상태 |
| `--warning` | `#F59E0B` | 경고 상태 |
| `--ring` | `#00D4AA` | focus ring |

#### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAFA` | 페이지 배경 |
| `--surface` | `#FFFFFF` | 컨텐츠 영역 |
| `--card` | `#FFFFFF` | 카드 배경 |
| `--elevated` | `#F5F5F5` | 상위 레이어 |
| `--primary` | `#0D9488` | 시안/틸 (dark보다 어둡게) |
| `--primary-hover` | `#0F766E` | primary hover |
| `--primary-foreground` | `#FFFFFF` | primary 위 텍스트 |
| `--foreground` | `#0A0A0A` | 기본 텍스트 |
| `--muted` | `#737373` | 보조 텍스트 |
| `--border` | `rgba(0,0,0,0.08)` | 기본 border |
| `--destructive` | `#DC2626` | 삭제/위험 |

### 2.2 Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| 영문 본문/제목 | Geist | 400-700 | 일반 UI 텍스트 전체 |
| 영문 터미널 요소 | Geist Mono | 400-600 | 다운로드 코드, 상태 메시지, nav 링크, 코드 블록, 터미널 UI 요소 |
| 한국어 | Pretendard | 400-700 | 한국어 텍스트 전체 |
| 일본어 | Noto Sans JP | 400-700 | 일본어 텍스트 |
| 중국어 간체 | Noto Sans SC | 400-700 | 중국어 간체 |
| 중국어 번체 | Noto Sans TC | 400-700 | 중국어 번체 |

Geist Mono 적용 요소:
- Header nav 링크 (`home`, `cli`, `history`)
- 다운로드 코드 입력/표시 (`847291`)
- 업로드 진행률 (`73%`, 남은 시간)
- CLI 페이지 코드 블록
- 파일 크기, 만료 시간 등 데이터 표시
- Footer 링크
- 터미널 허브 탭 (`upload`, `download`)

### 2.3 Glass Hierarchy

3단계 frosted glass 시스템:

| Level | Element | Properties |
|-------|---------|------------|
| L1 - Strong | Header, Modal | `backdrop-filter: blur(16px)`, `bg: rgba(255,255,255,0.06)`, `border: rgba(255,255,255,0.1)`, `box-shadow: 0 0 20px rgba(0,212,170,0.05)` |
| L2 - Medium | Card, Panel, Terminal Box | `backdrop-filter: blur(12px)`, `bg: rgba(255,255,255,0.04)`, `border: rgba(255,255,255,0.07)` |
| L3 - Solid | Dropdown, Popover, Toast | blur 없음, `bg: rgba(20,20,20,0.95)`, `border: rgba(255,255,255,0.08)` |

Light mode에서는 glass 효과를 톤다운:
- L1: `bg: rgba(255,255,255,0.7)`, `blur(12px)`, border 살짝 진하게
- L2: `bg: rgba(255,255,255,0.5)`, `blur(8px)`
- L3: solid `bg: white`, border만 적용

### 2.4 Interactive Grid Background

마우스 위치에 반응하는 도트 그리드 배경:
- CSS `radial-gradient`로 도트 패턴 (24px 간격, `rgba(255,255,255,0.05)`)
- JavaScript로 마우스 위치 추적
- 마우스 주변 반경 ~200px에 spotlight 효과: `mask-image: radial-gradient()` 또는 glow overlay
- 기본 상태: 도트가 매우 희미하게 보임
- 마우스 근처: 도트가 밝아지며 시안 tint
- 성능: `requestAnimationFrame` 기반, throttle 적용
- 모바일: 정적 도트 패턴 (spotlight 없이, 터치 디바이스에서는 인터랙티브 불필요)
- 적용 범위: 메인 배경 (전 페이지), 홈페이지에서 가장 강하게

### 2.5 Noise Texture Overlay

SVG filter 기반 미세한 grain 텍스트처:
```css
.noise-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.04;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
  filter: url(#grain);
}
```
- Dark mode: opacity 0.03-0.05
- Light mode: opacity 0.02 또는 비활성화

### 2.6 Animations (Motion v12)

| Category | Animation | Duration | Easing |
|----------|-----------|----------|--------|
| Page transition | fade + slide up | 300ms | ease-out |
| Card hover | subtle scale(1.01) + glow intensify | 200ms | ease-out |
| Button hover | background brightness + slight scale | 150ms | ease-out |
| Modal enter | fade + scale(0.95→1) | 250ms | spring |
| Modal exit | fade + scale(1→0.95) | 200ms | ease-in |
| Toast enter | slide from right + fade | 300ms | spring |
| Toast exit | slide right + fade | 200ms | ease-in |
| Dropdown | fade + slide from top 4px | 200ms | ease-out |
| Progress bar | width transition | 1000ms | ease-out |
| Tab switch | underline slide + content crossfade | 200ms | ease-out |

### 2.7 Border Radius

| Element | Radius |
|---------|--------|
| Card / Panel | `12px` |
| Button (default) | `8px` |
| Button (large) | `10px` |
| Input / Textarea | `8px` |
| Modal | `16px` |
| Badge / Tag | `6px` |
| Avatar | `full (50%)` |
| Toast | `10px` |

### 2.8 Button Variants

| Variant | Dark Mode | Light Mode |
|---------|-----------|------------|
| `default` | bg: `#00D4AA`, text: `#000`, hover: `#00E5BB` | bg: `#0D9488`, text: `#FFF`, hover: `#0F766E` |
| `secondary` | bg: `rgba(255,255,255,0.06)`, border: `rgba(255,255,255,0.08)`, text: `#FAFAFA` | bg: `#F5F5F5`, text: `#0A0A0A` |
| `ghost` | bg: transparent, hover: `rgba(255,255,255,0.06)` | bg: transparent, hover: `rgba(0,0,0,0.04)` |
| `destructive` | bg: `#EF4444`, text: `#FFF` | bg: `#DC2626`, text: `#FFF` |
| `outline` | bg: transparent, border: `rgba(255,255,255,0.08)`, text: `#FAFAFA` | bg: transparent, border: `rgba(0,0,0,0.12)` |

---

## 3. Layout Structure

### 3.1 Global Layout

```
┌─────────────────────────────────────────────┐
│  Header (Glass L1, sticky top, z-50)        │
│  >_ ShareAnything   home  cli  history  [user/signin]  │
├─────────────────────────────────────────────┤
│                                             │
│  Interactive Grid Background (전체)          │
│  Noise Overlay (전체)                        │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         Page Content                │    │
│  │         (max-w-5xl, mx-auto)       │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  Footer (미니멀, border-top)                 │
│  privacy  terms  github  [lang] [theme]     │
└─────────────────────────────────────────────┘
```

### 3.2 Header

- Glass L1 적용
- 좌측: `>_` 프롬프트 아이콘(시안) + `ShareAnything` (Geist Bold)
- 중앙/우측 nav: `home`, `cli`, `history` (Geist Mono, 소문자)
  - 현재 페이지는 시안 컬러 + 하단 언더라인
- 우측 끝: 로그인 시 프로필 드롭다운, 미로그인 시 `Sign in` 버튼 (primary)
- `Try CLI` 뱃지 유지 (secondary variant)
- 높이: `h-14`
- 모바일: 로고 + 햄버거 또는 축소된 nav

### 3.3 Footer

- 미니멀 디자인, `border-top: rgba(255,255,255,0.04)`
- 링크: privacy, terms, cli, github (Geist Mono, 11px, muted color)
- 언어/테마 드롭다운 유지
- 소셜 아이콘 유지 (GitHub, Portfolio, Email)

---

## 4. Page Specifications

### 4.1 HomePage - Terminal Hub

**핵심 변경**: 기존 QuickAccess + 2열 카드 → 중앙 터미널 허브 단일 인터페이스

```
┌──────────────────────────────────────┐
│            [Header]                  │
├──────────────────────────────────────┤
│                                      │
│        ● interactive grid bg ●       │
│        ● cyan glow (center) ●        │
│                                      │
│         ShareAnything.               │
│         (Geist Bold, 48px)           │
│                                      │
│    ┌──────────────────────────┐      │
│    │  [upload]  │  [download] │ ← 탭 │
│    ├──────────────────────────┤      │
│    │                          │      │
│    │  (upload tab)            │      │
│    │  File dropzone           │      │
│    │  + QuickAccess 파일 목록  │      │
│    │                          │      │
│    │  (download tab)          │      │
│    │  >_ [______] [→]        │      │
│    │                          │      │
│    └──────────────────────────┘      │
│          Glass L2 Terminal Box       │
│                                      │
│            [Footer]                  │
└──────────────────────────────────────┘
```

**기능 매핑 (기존 → 신규):**
- QuickAccess 위젯 → upload 탭 내에 통합
  - 로그인 사용자: 파일 드롭존 + 기존 QuickAccess 파일 목록 (업로드중/완료)
  - 비로그인 사용자: 파일 드롭존 + 로그인 유도
  - 기존 기능 모두 유지: 드래그앤드롭 업로드, 진행률, 다운로드/삭제 버튼, 파일 프리뷰, 만료 시간 표시
- 다운로드 카드 → download 탭
  - 6자리 코드 입력 (Geist Mono, monospace)
  - `>_` 프롬프트 심볼 좌측
  - Enter 또는 화살표 버튼으로 이동
  - `/` 키 단축키 유지 (download 탭으로 전환 + focus)

**불필요한 텍스트 제거**: 설명 문구, 마케팅 카피 없음. UI가 스스로 말하도록.

### 4.2 UploadPage

**현재 기능 전부 유지:**
- TransferTypeToggle (서버/P2P 전환) + P2P 툴팁
- FileDropzone (드래그앤드롭, 파일 목록, 썸네일, 삭제, 프리뷰)
- TransferSettings (만료 시간, 일회성 다운로드, 비밀번호, 설명)
- UploadProgressBar (진행률, 남은 시간, 취소, Turnstile)
- 파일 복원 (sessionStorage/IndexedDB)
- P2P fallback → 서버 업로드 전환

**디자인 변경:**
- 전체 레이아웃을 Glass L2 카드 안에 배치
- 드롭존: dashed border → 시안 tint, hover 시 glow 효과
- 전송 타입 토글: 터미널 스타일 탭 (Geist Mono)
- 만료 시간 옵션: 버튼 그룹 → 터미널 스타일 세그먼트 컨트롤
- 진행률 바: 시안 컬러 + glow 효과
- Turnstile 위젯: 기존 위치 유지

### 4.3 UploadSuccessPage

**현재 기능 전부 유지:**
- 공유 코드 표시 (큰 글씨, 복사 버튼)
- 공유 링크 (input + 복사 버튼)
- QR 코드
- 만료 시간 표시
- P2P 전송 상태 (대기중/연결됨/전송중/완료)
- P2P 파일별 진행률
- P2P 연결 실패 모달 (재시도/서버 전환)
- 파일 목록 (썸네일, 크기, 상태)
- 파일 프리뷰 모달

**디자인 변경:**
- Glass L2 카드로 감싸기
- 공유 코드: Geist Mono, 더 큰 사이즈, 시안 glow 효과
- 상태 아이콘: 시안 계열로 통일 (체크마크 = primary)
- P2P 상태 표시: 터미널 스타일 상태 메시지

### 4.4 DownloadFilePage

**현재 기능 전부 유지:**
- Turnstile 검증
- 로딩 상태
- 에러 상태 (DownloadErrorState)
- 비밀번호 입력 폼 (PasswordForm)
- 단일 파일 뷰 (SingleFileView)
  - 파일 프리뷰 (이미지/PDF/비디오/문서)
  - 다운로드 버튼
  - 진행률/남은 시간
  - P2P 다운로드 상태
- 다중 파일 뷰 (MultiFileList)
  - 파일 선택/전체 선택/해제
  - ZIP 다운로드
  - 개별 다운로드
  - 다운로드 취소
- P2P 다운로드 (WebRTC)
  - 파일별 P2P 다운로드 시작/취소
  - 연결 상태/진행률/완료 표시

**디자인 변경:**
- Glass L2 카드 레이아웃
- 프리뷰 영역: glass border + 라운드 코너
- 다운로드 버튼: primary (시안)
- 진행률: 시안 glow
- 비밀번호 폼: 터미널 스타일 입력 (`>_ password:`)

### 4.5 UploadHistoryPage

**현재 기능 전부 유지:**
- 데스크탑: 테이블 뷰 (HistoryTable)
  - 파일명, 크기, 업로드/만료 시간, 다운로드 수, 상태
  - 행 클릭 → 확장 (프리뷰, 다운로드 로그, QR 코드)
  - 삭제 (개별/전체)
  - 가로 스크롤 힌트
- 모바일: 카드 뷰 (HistoryMobileCards)
  - 같은 기능, 카드 레이아웃
- 페이지네이션 (HistoryPagination)
- 다운로드 로그 모달 (수신자, 플랫폼, IP, 시간)
- QR 코드 모달 + 공유 링크 복사
- 파일 프리뷰 모달
- 스켈레톤 로딩 상태

**디자인 변경:**
- 테이블: Glass L2 카드 안에 배치, 스트라이프 없이 border 구분
- 상태 뱃지: 활성=primary, 만료=muted
- QR 모달/로그 모달: Glass L1
- 모바일 카드: Glass L2, hover glow

### 4.6 SettingsPage

**현재 기능 전부 유지:**
- 4개 탭: notifications, general, account, personal-tokens
- 사이드바 네비게이션 (데스크탑) / 가로 탭 (모바일)
- Notifications 탭:
  - 업로드/다운로드/다운로드 알림 토글 (Switch)
  - 알림 언어 선택 (Popover)
- General 탭:
  - 사이트 언어 선택
  - 사이트 테마 선택
- Account 탭:
  - 이름 변경 (Input + Save 버튼)
  - 계정 삭제 (확인 프로세스)
- Personal Tokens 탭:
  - 토큰 생성 (이름 입력 + Create)
  - 생성된 토큰 표시 (복사, 한번만 표시 경고)
  - 토큰 목록 (이름, prefix, 생성일, 마지막 사용일)
  - 토큰 폐기

**디자인 변경:**
- 사이드바: Glass L2 패널
- 설정 항목: 구분선은 `border` 변수 사용
- Switch 토글: 시안 active 컬러
- Popover: Glass L3 (solid)
- 토큰 표시 영역: 터미널 스타일 코드 블록 (Geist Mono)

### 4.7 LoginPage

**현재 기능 전부 유지:**
- OAuth 버튼 4개 (Google, Naver, Kakao, Apple)
- 각 provider 브랜드 컬러 유지
- 최근 로그인 버블 (RecentLoginBubble)
- 이메일 로그인 (입력 + 전송)
- 이메일 에러 메시지
- 약관 동의 텍스트

**디자인 변경:**
- 중앙 정렬 Glass L2 카드 안에 폼 배치
- OAuth 버튼: 브랜드 컬러 유지하되 border-radius와 hover 효과 통일
- 디바이더: `rgba(255,255,255,0.06)` 라인
- 이메일 입력: 터미널 스타일 힌트

### 4.8 CliPage

**현재 기능 전부 유지:**
- CLI 설치 방법 (npm, curl)
- 명령어 레퍼런스 (upload, download, login, logout, list, info)
- 코드 블록 (구문 하이라이팅, 복사 버튼)
- 옵션 참조 테이블
- curl vs share-cli 비교 테이블
- Guest vs Personal Token 비교 테이블
- Personal Token 관리 링크

**디자인 변경:**
- 코드 블록: dark terminal 스타일 (bg: `#0A0A0A`, border: glass border)
- 구문 하이라이팅: 시안 계열 (명령어=primary, 플래그=accent, URL=muted)
- 테이블: Glass L2 스타일, border 통일
- 전체적으로 터미널 문서 느낌

### 4.9 기타 페이지

모든 기존 페이지 유지:
- **CliSigninPage**: CLI 인증 플로우 (기능 동일, 새 디자인 적용)
- **NotFoundPage**: 404 (Lottie 애니메이션 유지, 새 디자인)
- **PrivacyPolicyPage / TermsOfUsePage**: 법적 페이지 (언어별 컴포넌트 유지, 새 레이아웃)
- **EmailVerifyWaitPage**: 이메일 인증 대기 (기능 동일)
- **EmailMagicLinkCallbackPage**: 매직 링크 핸들러 (기능 동일)
- **OAuthCallbackPage**: OAuth 콜백 (기능 동일)

---

## 5. Component Inventory

### 5.1 신규 공통 컴포넌트

| Component | Description |
|-----------|-------------|
| `InteractiveGridBg` | 마우스 반응형 도트 그리드 배경 |
| `NoiseOverlay` | SVG grain 텍스처 오버레이 |
| `GlassCard` | Glass L2 카드 (기존 Card 대체) |
| `TerminalInput` | `>_` 프롬프트 + monospace 입력 필드 |
| `TerminalTabs` | 터미널 스타일 탭 컴포넌트 |
| `GlowButton` | hover 시 시안 glow가 있는 버튼 |

### 5.2 기존 컴포넌트 (리스타일링)

모든 기존 UI 컴포넌트를 새 디자인 시스템으로 리스타일링:

| Component | Changes |
|-----------|---------|
| `Button` | 시안 primary, glass hover 효과 |
| `Card` | Glass L2 기본, 기존 Card API 유지 |
| `Input` | dark bg, 시안 focus ring |
| `Dialog` | Glass L1, 시안 glow shadow |
| `DropdownMenu` | Glass L3 (solid) |
| `Popover` | Glass L3 (solid) |
| `Switch` | 시안 active 상태 |
| `Progress` | 시안 컬러 + glow 효과 |
| `Checkbox` | 시안 체크 상태 |
| `Tooltip` | Glass L3 |
| `Badge` | 시안/muted 변형 |
| `Toast` | Glass L3, slide-in 애니메이션 |
| `Skeleton` | `#171717` → `#262626` shimmer |
| `Spinner` | 시안 컬러 |
| `Table` | glass border, muted header |
| `Separator` | `rgba(255,255,255,0.06)` |

### 5.3 기존 기능 컴포넌트 (로직 유지, 스타일 변경)

| Component | Preserved Logic |
|-----------|-----------------|
| `Header` | auth 상태, 드롭다운 메뉴, nav 링크 |
| `Footer` | 언어/테마 전환, 링크 |
| `QuickAccess` | 드래그앤드롭, 파일 CRUD, 업로드 진행률, 프리뷰 |
| `FilePreviewModal` | 모든 파일 타입 프리뷰 (PDF, Excel, DOCX, 이미지, 비디오 등) |
| `FileThumbnail` | 파일 타입별 썸네일 생성 |
| `DownloadLogsModal` | 다운로드 로그 테이블 |
| `StyledQRCode` | QR 코드 생성 |
| `TurnstileWidget` | Cloudflare CAPTCHA |
| `Toast` | toast.success/error/warning/info API 유지 |

### 5.4 페이지 하위 컴포넌트 (로직 유지, 스타일 변경)

| Component | Page | Preserved Logic |
|-----------|------|-----------------|
| `FileDropzone` | Upload | 드래그앤드롭, 파일 목록, 삭제, 프리뷰 |
| `TransferSettings` | Upload | 만료/비밀번호/설명/일회성 설정 |
| `TransferTypeToggle` | Upload | 서버/P2P 전환, P2P 툴팁 |
| `UploadProgressBar` | Upload | 진행률, 취소, Turnstile |
| `SingleFileView` | Download | 단일 파일 다운로드/P2P/프리뷰 |
| `MultiFileList` | Download | 다중 파일 선택/ZIP/개별 다운로드 |
| `PasswordForm` | Download | 비밀번호 입력/검증 |
| `DownloadErrorState` | Download | 에러 표시 |
| `HistoryTable` | History | 데스크탑 테이블 뷰 |
| `HistoryMobileCards` | History | 모바일 카드 뷰 |
| `HistoryPagination` | History | 페이지네이션 |

---

## 6. Routing (Next.js App Router)

```
app/
├── layout.tsx                    ← 글로벌 레이아웃 (Header, Footer, Providers, Grid, Noise)
├── page.tsx                      ← HomePage (/)
├── signin/page.tsx               ← LoginPage
├── upload/
│   └── page.tsx                  ← UploadPage
├── upload/success/
│   └── page.tsx                  ← UploadSuccessPage
├── download/[code]/
│   └── page.tsx                  ← DownloadFilePage
├── history/
│   └── page.tsx                  ← UploadHistoryPage
├── settings/
│   └── page.tsx                  ← SettingsPage
├── cli/
│   └── page.tsx                  ← CliPage
├── cli-signin/[sessionId]/
│   └── page.tsx                  ← CliSigninPage
├── auth/
│   ├── callback/[provider]/
│   │   └── page.tsx              ← OAuthCallbackPage
│   └── email/
│       ├── verify-wait/
│       │   └── page.tsx          ← EmailVerifyWaitPage
│       └── magic-link/
│           └── page.tsx          ← EmailMagicLinkCallbackPage
├── privacy-policy/
│   └── page.tsx                  ← PrivacyPolicyPage
├── terms-of-use/
│   └── page.tsx                  ← TermsOfUsePage
└── not-found.tsx                 ← 404 Page
```

---

## 7. Context & State Migration

모든 Context를 `'use client'` 컴포넌트로 감싸서 기존 로직 유지:

| Context | Migration Notes |
|---------|-----------------|
| `ThemeContext` | 다크 기본값으로 변경, `class` 기반 유지 |
| `LanguageContext` | 그대로 복사, 폰트 스위칭 로직 유지 |
| `AuthContext` | 그대로 복사, localStorage 기반 |
| `ToastContext` | 그대로 복사, 새 Toast 디자인 적용 |
| `QuickAccessUploadContext` | 그대로 복사 |

---

## 8. Performance Considerations

- `backdrop-filter`: GPU 집약적이므로 동시에 3개 이하 요소에만 적용
- `InteractiveGridBg`: `requestAnimationFrame` + throttle (16ms)
- `NoiseOverlay`: SVG filter는 한번 렌더 후 고정, `position: fixed` 로 reflow 방지
- Motion 애니메이션: `will-change: transform, opacity` 적용
- Next.js Image 최적화 활용
- 폰트: `next/font`로 최적 로딩 (Geist, Geist Mono 내장)

---

## 9. Design Principles

1. **UI가 스스로 말한다** - 불필요한 설명 텍스트, 마케팅 카피 없음
2. **터미널 힌트** - Geist Mono + `>_` 프롬프트로 터미널 감성, 과하지 않게
3. **계층적 깊이** - Glass L1/L2/L3 + glow로 시각적 레이어 구분
4. **시안 액센트** - 모든 인터랙티브 요소에 일관된 시안/틸 컬러
5. **미니멀** - 꼭 필요한 요소만. 장식적 요소 최소화
6. **기능 보존** - 기존 기능 하나도 빠지지 않음. API 형식 변경 없음

---

## 10. Feature Checklist

기존 기능이 누락되지 않도록 하는 전체 체크리스트:

### Authentication
- [ ] Google OAuth 로그인
- [ ] Naver OAuth 로그인
- [ ] Kakao OAuth 로그인
- [ ] Apple OAuth 로그인
- [ ] 이메일 매직링크 로그인
- [ ] 이메일 인증 대기 페이지
- [ ] 로그아웃
- [ ] 최근 로그인 제공자 표시

### File Upload
- [ ] 드래그앤드롭 파일 선택
- [ ] 클릭으로 파일 선택
- [ ] 다중 파일 업로드
- [ ] 서버 업로드 (multipart, chunked)
- [ ] P2P 업로드 (WebRTC)
- [ ] 서버/P2P 전환 토글
- [ ] P2P 설명 툴팁
- [ ] 업로드 진행률 + 남은 시간
- [ ] 업로드 취소
- [ ] 만료 시간 설정 (5m~24h)
- [ ] 비밀번호 보호
- [ ] 일회성 다운로드 설정
- [ ] 파일 설명 입력
- [ ] Turnstile 보안 검증
- [ ] 페이지 새로고침 시 파일/설정 복원
- [ ] P2P 실패 시 서버 업로드 폴백

### Upload Success
- [ ] 공유 코드 표시 + 복사
- [ ] 공유 링크 표시 + 복사
- [ ] QR 코드
- [ ] 만료 시간 표시
- [ ] P2P 대기/연결/전송/완료 상태
- [ ] P2P 파일별 진행률 + 남은 시간
- [ ] P2P 파일별 전송 취소
- [ ] P2P 연결 실패 → 재시도/서버 전환 모달
- [ ] 파일 프리뷰

### File Download
- [ ] Turnstile 검증
- [ ] 6자리 코드로 파일 접근
- [ ] 비밀번호 입력/검증
- [ ] 단일 파일 다운로드
- [ ] 다중 파일 선택 다운로드
- [ ] ZIP 다운로드
- [ ] 다운로드 진행률 + 남은 시간
- [ ] 다운로드 취소
- [ ] P2P 다운로드 (WebRTC)
- [ ] 파일 프리뷰 (이미지, PDF, 비디오, 문서)
- [ ] 에러 상태 (만료, 404, 429, 오프라인)
- [ ] 파일 목록 설명 표시

### Quick Access
- [ ] 드래그앤드롭 업로드 (비로그인: 로그인 유도)
- [ ] 파일 목록 (썸네일, 크기, 만료시간, 업로드 출처)
- [ ] 파일 다운로드
- [ ] 파일 삭제
- [ ] 파일 프리뷰
- [ ] 업로드 진행률
- [ ] 업로드 취소

### Upload History
- [ ] 테이블 뷰 (데스크탑) + 카드 뷰 (모바일)
- [ ] 파일명, 크기, 업로드/만료 시간, 다운로드 수, 상태
- [ ] 행 확장 → 프리뷰, 다운로드 로그
- [ ] QR 코드 모달 + 링크 복사
- [ ] 파일 삭제 (개별/전체)
- [ ] 다운로드 로그 모달
- [ ] 페이지네이션
- [ ] 스켈레톤 로딩
- [ ] 가로 스크롤 힌트

### Settings
- [ ] 알림 설정 (업로드/다운로드/다운로드 알림 토글)
- [ ] 알림 언어 설정
- [ ] 사이트 언어 설정
- [ ] 사이트 테마 설정 (system/light/dark)
- [ ] 계정 이름 변경
- [ ] 계정 삭제
- [ ] Personal Token 생성
- [ ] Personal Token 목록/폐기

### CLI Page
- [ ] 설치 방법 (npm, curl)
- [ ] 명령어 레퍼런스
- [ ] 코드 블록 + 복사 + 구문 하이라이팅
- [ ] 옵션/비교/제한 테이블
- [ ] Personal Token 관리 링크

### Other
- [ ] 5개 언어 지원 (ko, en, ja, zh-CN, zh-TW)
- [ ] 다크/라이트/시스템 테마
- [ ] 404 페이지
- [ ] 개인정보처리방침 (5개 언어)
- [ ] 이용약관 (5개 언어)
- [ ] CLI 로그인 (sessionId 기반)
- [ ] 파일 프리뷰 모달 (20+ 파일 타입)
- [ ] 반응형 (mobile-first)
- [ ] 키보드 단축키 (`/` → 다운로드 코드 입력)
- [ ] View Transition API (테마 전환)
