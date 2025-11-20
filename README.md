# ShareAnything Web

SendAnywhere와 유사한 파일 공유 웹 서비스의 프론트엔드 애플리케이션입니다.

## 주요 기능

- 🚀 **파일 업로드**: 드래그 앤 드롭 또는 파일 탐색기를 통한 여러 파일 동시 업로드
- 🔐 **비밀번호 보호**: 로그인 사용자는 파일에 비밀번호 설정 가능
- ⏰ **만료 기간 설정**: 1시간부터 1개월까지 다양한 만료 기간 선택 (로그인 필요)
- 📱 **QR 코드**: 모바일에서 쉽게 다운로드할 수 있는 QR 코드 제공
- 🔑 **OAuth 로그인**: Google 및 Naver OAuth 지원
- 📊 **파일 정보**: 파일 크기, 타입, 설명, 만료 시간 등 상세 정보 표시

## 기술 스택

- **React 19** with TypeScript
- **React Router** for routing
- **Axios** for API communication
- **TailwindCSS** for styling
- **React Dropzone** for file upload
- **QRCode.react** for QR code generation
- **Heroicons** for icons

## 시작하기

### 1. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 API URL을 설정합니다:

```env
REACT_APP_API_URL=http://localhost:8080
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm start
```

앱이 개발 모드로 실행됩니다.
브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인할 수 있습니다.

### 4. 프로덕션 빌드

```bash
npm run build
```

프로덕션용 앱을 `build` 폴더에 빌드합니다.

## 프로젝트 구조

```
src/
├── components/        # 재사용 가능한 컴포넌트
│   └── Header.tsx
├── pages/            # 페이지 컴포넌트
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── UploadPage.tsx
│   ├── UploadSuccessPage.tsx
│   ├── DownloadPage.tsx
│   └── DownloadFilePage.tsx
├── context/          # React Context (인증)
│   └── AuthContext.tsx
├── services/         # API 서비스
│   └── api.ts
├── types/           # TypeScript 타입 정의
│   └── index.ts
├── utils/           # 유틸리티 함수
│   └── format.ts
├── App.tsx          # 메인 앱 컴포넌트
└── index.tsx        # 앱 진입점
```

## 주요 페이지

### 홈 페이지 (`/`)
- 업로드/다운로드 선택 화면

### 로그인 페이지 (`/login`)
- Google 및 Naver OAuth 로그인

### 업로드 페이지 (`/upload`)
- 파일 드래그 앤 드롭 업로드
- 파일 설명 입력
- 만료 기간 선택 (로그인 필요)
- 비밀번호 설정 (로그인 필요)

### 업로드 완료 페이지 (`/upload/success`)
- 6자리 공유 코드 표시
- 다운로드 링크 및 복사 기능
- QR 코드 표시

### 다운로드 페이지 (`/download`)
- 6자리 공유 코드 입력

### 다운로드 파일 페이지 (`/download/:code`)
- 비밀번호 확인 (필요시)
- 파일 정보 표시
- 파일 다운로드

## API 연동

백엔드 API와 통신하기 위해서는 백엔드 서버가 실행 중이어야 합니다.
API 명세는 프로젝트 루트의 API 문서를 참조하세요.

## 라이선스

이 프로젝트는 학습 목적으로 만들어졌습니다.
