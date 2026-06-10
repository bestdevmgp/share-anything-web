# Unified File Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈페이지에 통합 파일 박스(업로드/다운로드 토글)를 도입하고, 사이트 진입 시 1회 세션 토큰 발급으로 Turnstile UI를 제거하며, 사용자별 기본 만료시간(default_expiration) 설정을 추가한다.

**Architecture:** 백엔드의 매 요청 `turnstile_token` 패턴을 정석적으로 폐기하고 `X-Session-Token` 미들웨어로 일원화한다. 프론트는 `UnifiedFileBox` 컴포넌트가 6개 내부 상태를 가진 reducer로 박스 안의 모든 인터랙션(드롭→자동 업로드→인라인 성공→최근 공유 목록)을 호스팅한다. 멀티파트 업로드 파이프라인은 `useMultipartUpload` 훅으로 추출되어 `QuickAccessUploadContext`와 새 박스가 공유한다.

**Tech Stack:** 프론트 — React 19 + TypeScript + Tailwind + react-dropzone + axios. 백엔드 — Rust + Axum 0.7 + sqlx(MySQL) + jsonwebtoken.

**Repository layout:**
- 프론트: `/Users/mingyupark/Desktop/Dev/share-anything-web` (이 plan이 있는 곳)
- 백엔드: `/Users/mingyupark/Desktop/Dev/share-anything` (형제 디렉토리)

**User preference:** 자동 커밋 금지. 각 Task 끝의 "Checkpoint" 단계는 변경을 staged 상태로 두고 사용자가 검토 후 직접 커밋한다.

**Spec reference:** `docs/superpowers/specs/2026-06-08-unified-file-box-design.md`

---

## Phase 1 — Backend (Rust): Turnstile → 세션 토큰 정석 이전

### Task 1: `default_expiration` 컬럼 마이그레이션

**Files:**
- Create: `../share-anything/migrations/037_add_default_expiration.sql`

- [ ] **Step 1: Create migration file**

`../share-anything/migrations/037_add_default_expiration.sql`:
```sql
-- Add default_expiration column to users table.
-- Holds the user's preferred default expiration for fast/home uploads.
-- Allowed values match the ExpirationOption enum used by the frontend:
--   'five_minutes', 'thirty_minutes', 'one_hour', 'three_hours',
--   'six_hours', 'twelve_hours', 'twenty_four_hours'.
ALTER TABLE users
  ADD COLUMN default_expiration VARCHAR(32) NOT NULL DEFAULT 'thirty_minutes'
  AFTER notify_language;
```

- [ ] **Step 2: Apply migration locally**

Run from `../share-anything`:
```bash
sqlx migrate run
```
Expected: `Applied 037/migrate add_default_expiration` 또는 동등한 sqlx 출력.

- [ ] **Step 3: Verify column added**

Run from `../share-anything`:
```bash
mysql -u <user> -p<password> <db> -e "SHOW COLUMNS FROM users LIKE 'default_expiration';"
```
Expected: 한 행, `Default = thirty_minutes`, `Null = NO`.

- [ ] **Step 4: Checkpoint — review and stage**

Stage the new migration file. Do not commit yet (will be bundled with code changes in Task 4 checkpoint).

---

### Task 2: `User` 모델에 `default_expiration` 추가

**Files:**
- Modify: `../share-anything/src/models/user.rs:27-43, 70-85`

- [ ] **Step 1: Add field to User struct**

`../share-anything/src/models/user.rs:27-43` — `User` 구조체에 필드 추가 (선언 순서는 DB 컬럼 순서를 따름):
```rust
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct User {
    pub id: String,
    #[serde(deserialize_with = "deserialize_oauth_provider")]
    pub oauth_provider: OAuthProvider,
    pub oauth_id: String,
    pub email: String,
    pub name: String,
    pub profile_image: Option<String>,
    pub status: UserStatus,
    pub notify_upload: bool,
    pub notify_download: bool,
    pub notify_download_alert: bool,
    pub notify_security: bool,
    pub notify_language: String,
    pub default_expiration: String,        // ← 추가
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

- [ ] **Step 2: Add field to FromRow impl**

같은 파일 `:70-85`의 `FromRow` 구현 끝에 추가:
```rust
        Ok(User {
            id: row.try_get("id")?,
            oauth_provider,
            oauth_id: row.try_get("oauth_id")?,
            email: row.try_get("email")?,
            name: row.try_get("name")?,
            profile_image: row.try_get("profile_image")?,
            status,
            notify_upload: row.try_get("notify_upload")?,
            notify_download: row.try_get("notify_download")?,
            notify_download_alert: row.try_get("notify_download_alert")?,
            notify_security: row.try_get("notify_security")?,
            notify_language: row.try_get("notify_language")?,
            default_expiration: row.try_get("default_expiration")?,   // ← 추가
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
```

- [ ] **Step 3: Update `NotificationSettingsResponse` and `UpdateNotificationSettingsRequest`**

같은 파일에서 `NotificationSettingsResponse` (around `:158-167`) 와 `UpdateNotificationSettingsRequest` 양쪽에 `default_expiration: String` 필드 추가. 다른 알림 필드와 같은 패턴(Serialize + Deserialize + ToSchema + utoipa 예시값).

예시:
```rust
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct NotificationSettingsResponse {
    pub notify_upload: bool,
    pub notify_download: bool,
    pub notify_download_alert: bool,
    pub notify_security: bool,
    pub notify_language: String,
    #[schema(example = "thirty_minutes")]
    pub default_expiration: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateNotificationSettingsRequest {
    pub notify_upload: bool,
    pub notify_download: bool,
    pub notify_download_alert: bool,
    pub notify_security: bool,
    pub notify_language: String,
    #[schema(example = "thirty_minutes")]
    pub default_expiration: String,
}
```

- [ ] **Step 4: Compile check**

Run from `../share-anything`:
```bash
cargo check
```
Expected: 컴파일 통과. 만약 다른 위치에서 두 구조체를 사용 중이라 `default_expiration` 누락으로 에러가 나면 다음 Task 들에서 해결.

---

### Task 3: 리포지토리 함수에 `default_expiration` 반영

**Files:**
- Modify: `../share-anything/src/db/repository.rs:72-90` (get), `:158-180` (update)

- [ ] **Step 1: Update `get_user_notification_settings` return type and query**

`../share-anything/src/db/repository.rs:72` 부근:
```rust
pub async fn get_user_notification_settings(
    pool: &MySqlPool,
    user_id: &str,
) -> Result<(bool, bool, bool, bool, String, String), sqlx::Error> {
    let result = sqlx::query_as::<_, (bool, bool, bool, bool, String, String)>(
        r#"
        SELECT notify_upload, notify_download, notify_download_alert, notify_security, notify_language, default_expiration FROM users WHERE id = ?
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(result)
}
```

- [ ] **Step 2: Update `update_user_notification_settings` signature and query**

`../share-anything/src/db/repository.rs:158` 부근:
```rust
pub async fn update_user_notification_settings(
    pool: &MySqlPool,
    user_id: &str,
    notify_upload: bool,
    notify_download: bool,
    notify_download_alert: bool,
    notify_security: bool,
    notify_language: &str,
    default_expiration: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE users SET notify_upload = ?, notify_download = ?, notify_download_alert = ?, notify_security = ?, notify_language = ?, default_expiration = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?
        "#,
    )
    .bind(notify_upload)
    .bind(notify_download)
    .bind(notify_download_alert)
    .bind(notify_security)
    .bind(notify_language)
    .bind(default_expiration)
    .bind(user_id)
    .execute(pool)
    .await?;
    Ok(())
}
```

- [ ] **Step 3: Compile check**

```bash
cargo check
```
Expected: settings 핸들러에서 호출자가 인자 수를 안 맞춰 에러 발생 가능 — Task 4 에서 해결.

---

### Task 4: `handlers/user.rs` settings 핸들러 갱신

**Files:**
- Modify: `../share-anything/src/handlers/user.rs` (settings GET/PUT 핸들러 본문)

- [ ] **Step 1: Find the settings handlers**

`../share-anything/src/handlers/user.rs` 안의 `get_notification_settings`, `update_notification_settings` 함수를 찾는다.

- [ ] **Step 2: Update GET handler**

GET 핸들러 본문에서 `get_user_notification_settings` 호출 결과 tuple 을 6개로 분해, 응답에 `default_expiration` 포함:
```rust
let (notify_upload, notify_download, notify_download_alert, notify_security, notify_language, default_expiration) =
    repository::get_user_notification_settings(&state.db, &user_claims.sub).await?;

Ok(Json(NotificationSettingsResponse {
    notify_upload,
    notify_download,
    notify_download_alert,
    notify_security,
    notify_language,
    default_expiration,
}))
```

- [ ] **Step 3: Update PUT handler**

PUT 핸들러 본문 — 요청에서 `default_expiration` 을 읽고, **유효성 검사** 추가 후 repository 호출에 전달:
```rust
const ALLOWED_EXPIRATIONS: &[&str] = &[
    "five_minutes", "thirty_minutes", "one_hour", "three_hours",
    "six_hours", "twelve_hours", "twenty_four_hours",
];
if !ALLOWED_EXPIRATIONS.contains(&request.default_expiration.as_str()) {
    return Err(bad_request("Invalid default_expiration value"));
}

repository::update_user_notification_settings(
    &state.db,
    &user_claims.sub,
    request.notify_upload,
    request.notify_download,
    request.notify_download_alert,
    request.notify_security,
    &request.notify_language,
    &request.default_expiration,
).await?;
```

- [ ] **Step 4: Compile**

```bash
cargo check
```
Expected: 통과.

- [ ] **Step 5: Test settings round-trip**

```bash
cargo test --lib repository::tests::update_user_notification_settings 2>&1 | head -50
```
기존 테스트가 없다면 별도로 작성하지 않고 다음으로. 대신 통합 시점에 수동 검증.

- [ ] **Step 6: Checkpoint**

Task 1~4 변경(마이그레이션 + 모델 + 리포지토리 + 핸들러)을 stage. 사용자가 검토 후 한 커밋으로 정리.

---

### Task 5: 세션 토큰 JWT 헬퍼 + 핸들러 생성

**Files:**
- Create: `../share-anything/src/handlers/session_token.rs`
- Modify: `../share-anything/src/handlers/mod.rs` (export 추가)
- Modify: `../share-anything/src/config.rs` (`SessionTokenConfig` 추가)
- Modify: `../share-anything/.env.example` (새 환경 변수)

- [ ] **Step 1: Add `SessionTokenConfig` to Config**

`../share-anything/src/config.rs` 안 `Config` 구조체와 로드 함수에 다음 추가 (기존 `TurnstileConfig` 패턴 모방):
```rust
pub struct SessionTokenConfig {
    pub jwt_secret: String,
    pub ttl_seconds: i64,
}

// ...within Config struct:
pub session_token: SessionTokenConfig,

// ...within Config::from_env():
session_token: SessionTokenConfig {
    jwt_secret: env::var("SESSION_TOKEN_JWT_SECRET")
        .expect("SESSION_TOKEN_JWT_SECRET must be set in environment"),
    ttl_seconds: env::var("SESSION_TOKEN_TTL_SECONDS")
        .unwrap_or_else(|_| "1800".to_string())
        .parse()
        .expect("SESSION_TOKEN_TTL_SECONDS must be an integer"),
},
```

- [ ] **Step 2: Add env vars to `.env.example`**

`../share-anything/.env.example` 끝에 추가:
```
# Session Token (issued after invisible Turnstile verification at site entry)
SESSION_TOKEN_JWT_SECRET=change-me-to-a-long-random-string
SESSION_TOKEN_TTL_SECONDS=1800
```

- [ ] **Step 3: Create session_token handler module**

`../share-anything/src/handlers/session_token.rs`:
```rust
use axum::{extract::State, http::StatusCode, Json};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;

use crate::{
    config::Config,
    models::{bad_request, forbidden, AppError},
    utils::{extract_client_ip, verify_turnstile_token},
};

#[derive(Clone)]
pub struct SessionTokenState {
    pub config: Arc<Config>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ExchangeRequest {
    pub turnstile_token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ExchangeResponse {
    pub session_token: String,
    pub expires_at: String, // RFC3339
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionTokenClaims {
    pub kind: String, // "session"
    pub iat: i64,
    pub exp: i64,
}

#[utoipa::path(
    post,
    path = "/auth/session-token",
    tag = "auth",
    request_body = ExchangeRequest,
    responses(
        (status = 200, description = "Session token issued", body = ExchangeResponse),
        (status = 400, description = "Missing turnstile token"),
        (status = 403, description = "Turnstile verification failed"),
    )
)]
pub async fn exchange_session_token(
    State(state): State<SessionTokenState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ExchangeRequest>,
) -> Result<Json<ExchangeResponse>, AppError> {
    if req.turnstile_token.is_empty() {
        return Err(bad_request("turnstile_token is required"));
    }
    let client_ip = extract_client_ip(&headers);
    verify_turnstile_token(
        &state.config.turnstile.secret_key,
        &req.turnstile_token,
        Some(client_ip),
    )
    .await
    .map_err(|e| forbidden(&format!("Turnstile verification failed: {}", e)))?;

    let now = Utc::now();
    let exp = now + Duration::seconds(state.config.session_token.ttl_seconds);
    let claims = SessionTokenClaims {
        kind: "session".to_string(),
        iat: now.timestamp(),
        exp: exp.timestamp(),
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.session_token.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encode failed: {}", e)))?;

    Ok(Json(ExchangeResponse {
        session_token: token,
        expires_at: exp.to_rfc3339(),
    }))
}
```

- [ ] **Step 4: Export the module**

`../share-anything/src/handlers/mod.rs` 에 `pub mod session_token;` 추가.

- [ ] **Step 5: Compile**

```bash
cargo check
```
`AppError::Internal` variant 가 없다면 `internal_error("...")` 헬퍼로 대체. `bad_request`/`forbidden` 시그니처에 맞춰 조정.

---

### Task 6: 세션 토큰 미들웨어

**Files:**
- Create: `../share-anything/src/middleware/session_token.rs`
- Modify: `../share-anything/src/middleware/mod.rs`

- [ ] **Step 1: Create middleware**

`../share-anything/src/middleware/session_token.rs`:
```rust
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;
use std::sync::Arc;

use crate::{config::Config, handlers::session_token::SessionTokenClaims};

const HEADER: &str = "X-Session-Token";

pub async fn require_session_token(
    State(config): State<Arc<Config>>,
    request: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // 사용자 JWT(Authorization: Bearer ...) 가 이미 있고 인증 미들웨어 통과한 경우, 면제.
    // 본 미들웨어는 인증 미들웨어보다 뒤에 위치한다고 가정.
    if request.extensions().get::<crate::middleware::auth::Claims>().is_some() {
        return Ok(next.run(request).await);
    }

    let header = request
        .headers()
        .get(HEADER)
        .and_then(|v| v.to_str().ok());

    let token = match header {
        Some(t) if !t.is_empty() => t.to_string(),
        _ => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({ "code": "SESSION_TOKEN_REQUIRED", "message": "Session token required" })),
            ));
        }
    };

    let validation = Validation::default();
    let key = DecodingKey::from_secret(config.session_token.jwt_secret.as_bytes());
    let decoded = decode::<SessionTokenClaims>(&token, &key, &validation).map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "code": "SESSION_TOKEN_EXPIRED", "message": "Session token invalid or expired" })),
        )
    })?;

    if decoded.claims.kind != "session" {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "code": "SESSION_TOKEN_INVALID", "message": "Wrong token kind" })),
        ));
    }

    Ok(next.run(request).await)
}
```

- [ ] **Step 2: Export the module**

`../share-anything/src/middleware/mod.rs` 에 `pub mod session_token;` 추가.

- [ ] **Step 3: Compile**

```bash
cargo check
```
Validation 의 정확한 시그니처/인증 미들웨어의 Claims 경로는 실제 코드에 맞춰 조정.

---

### Task 7: 라우팅 — 신규 엔드포인트 + 미들웨어 적용

**Files:**
- Modify: `../share-anything/src/routes.rs`
- Modify: `../share-anything/src/docs.rs` (utoipa 등록)

- [ ] **Step 1: Register POST `/auth/session-token`**

`../share-anything/src/routes.rs` — 인증 라우트 그룹(또는 적절한 위치)에 추가:
```rust
.route(
    "/auth/session-token",
    post(handlers::session_token::exchange_session_token),
)
```
state 가 필요하면 `with_state(...)` 로 `SessionTokenState { config: config.clone() }` 전달.

- [ ] **Step 2: Apply middleware to protected routes**

기존에 매 요청 `turnstile_token` 을 받던 모든 변형 라우트(presigned 업로드 init/presign, p2p 세션 생성, 다운로드 메타/스트림 등)에 `axum::middleware::from_fn_with_state(config.clone(), middleware::session_token::require_session_token)` 적용.

라우트 구성 정확한 형태는 기존 패턴을 따른다. 인증 미들웨어가 먼저, 세션 토큰 미들웨어가 그 다음 순으로 체이닝.

- [ ] **Step 3: Add OpenAPI doc registration**

`../share-anything/src/docs.rs` 에 `handlers::session_token::exchange_session_token` 등록.

- [ ] **Step 4: Compile**

```bash
cargo check
```

- [ ] **Step 5: Checkpoint**

Task 5~7 변경 stage. 세션 토큰 발급/검증 인프라가 추가된 상태.

---

### Task 8: 매 요청 `turnstile_token` 필드 제거 (정석적 폐기)

**Files:**
- Modify: `../share-anything/src/models/upload.rs:26` 부근
- Modify: `../share-anything/src/models/file_share.rs:175, 226` 부근
- Modify: 위 두 파일을 import 하는 모든 핸들러

- [ ] **Step 1: Locate turnstile_token usages**

Run from `../share-anything`:
```bash
grep -rn "turnstile_token" src/
```
Expected: `models/upload.rs`, `models/file_share.rs`, 그리고 그 필드를 읽는 핸들러들이 나열됨.

- [ ] **Step 2: Remove fields from DTOs**

`models/upload.rs` 의 모든 `pub turnstile_token: String,` 라인 삭제. 같은 작업을 `models/file_share.rs` 에서도 수행.

- [ ] **Step 3: Remove all `verify_turnstile_token` calls from handlers**

`src/handlers/presigned.rs:63, 322`, `src/handlers/download.rs:148, 216` 부근의 `verify_turnstile_token(...)` 호출 + 직전에 토큰을 추출하던 코드 + 관련 import 모두 제거.

또한 `src/handlers/upload.rs`, p2p 핸들러에서도 동일하게 제거. grep 결과를 기준으로 빠뜨리지 말 것.

- [ ] **Step 4: Verify `verify_turnstile_token` remains only in session_token handler**

```bash
grep -rn "verify_turnstile_token" src/
```
Expected: `src/utils/turnstile.rs` (정의), `src/utils/mod.rs` (re-export), `src/handlers/session_token.rs` (호출). 그 외 0건.

- [ ] **Step 5: Verify `turnstile_token` field references are gone**

```bash
grep -rn "turnstile_token" src/ | grep -v "session_token.rs"
```
Expected: 0건.

- [ ] **Step 6: Compile**

```bash
cargo check
```

- [ ] **Step 7: Checkpoint**

Task 8 변경 stage. 백엔드의 매 요청 Turnstile 검증이 사라지고, 보안은 세션 토큰 미들웨어가 담당.

---

### Task 9: 업로드 init 핸들러 `expiration` fallback

**Files:**
- Modify: `../share-anything/src/handlers/presigned.rs` (multipart init)
- Modify: 다른 업로드 init 경로가 있다면 같은 패턴 적용

- [ ] **Step 1: Locate where expiration is read**

```bash
grep -n "expiration" /Users/mingyupark/Desktop/Dev/share-anything/src/handlers/presigned.rs | head -20
```

- [ ] **Step 2: Add fallback logic**

업로드 init 핸들러에서 `request.expiration` 이 `None` 일 때 분기:
```rust
let effective_expiration = match request.expiration.as_ref() {
    Some(e) => e.clone(),
    None => {
        // 인증된 사용자라면 default_expiration 사용, 아니면 30분 하드 디폴트
        if let Some(claims) = req_extensions.get::<crate::middleware::auth::Claims>() {
            match repository::find_user_by_id(&state.db, &claims.sub).await? {
                Some(user) => user.default_expiration.clone(),
                None => "thirty_minutes".to_string(),
            }
        } else {
            "thirty_minutes".to_string()
        }
    }
};
```
정확한 변수명/타입(`ExpirationOption` enum 등)은 코드 컨벤션에 맞춰 조정. 이후 DB insert 에서 `effective_expiration` 사용.

- [ ] **Step 3: Compile + cargo test**

```bash
cargo check && cargo test --lib 2>&1 | tail -30
```

- [ ] **Step 4: Checkpoint**

Task 9 변경 stage.

---

### Task 10: 백엔드 통합 테스트 (수동)

**Files:** N/A (테스트 실행만)

- [ ] **Step 1: Start backend**

```bash
cd ../share-anything && cargo run
```

- [ ] **Step 2: Get a session token**

```bash
# Cloudflare Turnstile 사이트키로 받은 토큰을 헤더에 넣어 호출
curl -X POST http://localhost:8080/auth/session-token \
  -H 'Content-Type: application/json' \
  -d '{"turnstile_token": "<valid-turnstile-token>"}'
```
Expected: `{"session_token": "<jwt>", "expires_at": "..."}`. 만료시간이 약 30분 뒤(ISO8601).

- [ ] **Step 3: Call protected endpoint without session token**

```bash
curl -i -X POST http://localhost:8080/file/multipart/init \
  -H 'Content-Type: application/json' \
  -d '{"files":[{"file_name":"a","file_size":1,"content_type":"text/plain"}],"chunk_size":5242880}'
```
Expected: `401 {"code":"SESSION_TOKEN_REQUIRED",...}`.

- [ ] **Step 4: Call with session token**

같은 요청에 `-H 'X-Session-Token: <jwt>'` 추가. Expected: 200 + upload session 응답.

- [ ] **Step 5: Settings round-trip**

```bash
# (인증된 사용자 토큰 필요)
curl http://localhost:8080/user/settings -H 'Authorization: Bearer <userJWT>'
# default_expiration 포함되어 있는지 확인. 기본값 "thirty_minutes".

curl -X PUT http://localhost:8080/user/settings \
  -H 'Authorization: Bearer <userJWT>' -H 'Content-Type: application/json' \
  -d '{"notify_upload":true,...,"default_expiration":"one_hour"}'
# 다시 GET 으로 "one_hour" 인지 확인.
```

- [ ] **Step 6: Checkpoint**

수동 검증 통과 시 Phase 1 백엔드 작업 완료. 사용자가 모든 변경 한 번에 검토.

---

## Phase 2 — Frontend 보안 인프라

### Task 11: 타입 정의 추가

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add SessionTokenResponse type**

`src/types/index.ts` 에 추가:
```typescript
export interface SessionTokenResponse {
  session_token: string;
  expires_at: string; // ISO8601
}
```

- [ ] **Step 2: Extend settings types**

같은 파일에 `NotificationSettings` 또는 그에 해당하는 인터페이스가 있다면 `default_expiration: ExpirationOption` 추가. 없으면 신규 선언:
```typescript
export interface UserSettings {
  notify_upload: boolean;
  notify_download: boolean;
  notify_download_alert: boolean;
  notify_security: boolean;
  notify_language: string;
  default_expiration: ExpirationOption;
}
```

- [ ] **Step 3: Type check**

```bash
cd /Users/mingyupark/Desktop/Dev/share-anything-web && npx tsc --noEmit
```
Expected: 통과(또는 기존 settings 사용처가 새 필드를 요구할 경우 호출자에서 후속 수정).

---

### Task 12: `services/api.ts` — 세션 토큰 API + 인터셉터

**Files:**
- Modify: `src/services/api.ts` (interceptor, authAPI, userAPI)

- [ ] **Step 1: Add session token store**

파일 상단(인터셉터 정의 직전)에 추가:
```typescript
let currentSessionToken: string | null = null;

export const setSessionToken = (token: string | null) => {
  currentSessionToken = token;
};

export const getSessionToken = (): string | null => currentSessionToken;
```

- [ ] **Step 2: Inject `X-Session-Token` in request interceptor**

기존 `api.interceptors.request.use((config) => {...})` 안에 추가:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (currentSessionToken) {
    config.headers['X-Session-Token'] = currentSessionToken;
  }
  return config;
});
```

- [ ] **Step 3: Add `authAPI.exchangeSessionToken`**

`authAPI` 객체에 신규 함수 추가:
```typescript
exchangeSessionToken: async (turnstileToken: string): Promise<SessionTokenResponse> => {
  const response = await api.post<SessionTokenResponse>('/auth/session-token', {
    turnstile_token: turnstileToken,
  });
  return response.data;
},
```
`SessionTokenResponse` import 추가.

- [ ] **Step 4: Update `userAPI.getSettings/updateSettings` types**

기존 GET/PUT 호출의 제네릭 타입에 `default_expiration: ExpirationOption` 추가. `getSettings` 의 응답 타입을 `UserSettings` 로 통일하고 `updateSettings` 인자도 동일 타입을 받게 정리.

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```
Expected: SettingsPage 등 호출자가 새 필드를 요구해 일부 에러 발생 가능 — 다음 Task 에서 해결.

---

### Task 13: `SessionTokenContext` 작성

**Files:**
- Create: `src/context/SessionTokenContext.tsx`

- [ ] **Step 1: Implement provider**

`src/context/SessionTokenContext.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { authAPI, setSessionToken } from '../services/api';

type Status = 'idle' | 'minting' | 'ready' | 'failed';

interface Ctx {
  status: Status;
  expiresAt: string | null;
}

const SessionTokenContext = createContext<Ctx | null>(null);

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY!;
const REFRESH_LEAD_MS = 60_000;

export const SessionTokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const widgetKey = useRef(0);
  const [_, setWidgetKey] = useState(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const scheduleRefresh = useCallback((expIso: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const ms = new Date(expIso).getTime() - Date.now() - REFRESH_LEAD_MS;
    if (ms <= 0) {
      forceRefresh();
      return;
    }
    refreshTimerRef.current = setTimeout(forceRefresh, ms);
  }, []);

  const forceRefresh = useCallback(() => {
    widgetKey.current += 1;
    setWidgetKey(widgetKey.current);
    setStatus('minting');
  }, []);

  const onTurnstileSuccess = useCallback(async (turnstileToken: string) => {
    setStatus('minting');
    try {
      const { session_token, expires_at } = await authAPI.exchangeSessionToken(turnstileToken);
      setSessionToken(session_token);
      setExpiresAt(expires_at);
      setStatus('ready');
      attemptsRef.current = 0;
      scheduleRefresh(expires_at);
    } catch (err) {
      console.warn('[SessionToken] mint failed', err);
      attemptsRef.current += 1;
      if (attemptsRef.current < 3) {
        setTimeout(forceRefresh, 1000 * attemptsRef.current);
      } else {
        setStatus('failed');
      }
    }
  }, [scheduleRefresh, forceRefresh]);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  return (
    <SessionTokenContext.Provider value={{ status, expiresAt }}>
      <div style={{ position: 'fixed', left: -9999, top: -9999, visibility: 'hidden' }} aria-hidden>
        <Turnstile
          key={widgetKey.current}
          siteKey={SITE_KEY}
          options={{ size: 'invisible' }}
          onSuccess={onTurnstileSuccess}
          onError={() => {
            attemptsRef.current += 1;
            if (attemptsRef.current >= 3) setStatus('failed');
          }}
        />
      </div>
      {children}
    </SessionTokenContext.Provider>
  );
};

export const useSessionTokenStatus = () => {
  const ctx = useContext(SessionTokenContext);
  if (!ctx) throw new Error('useSessionTokenStatus must be used within SessionTokenProvider');
  return ctx;
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: 통과. `@marsidev/react-turnstile` 의 invisible mode 지원이 다른 API 시그니처라면 옵션 형태 조정.

---

### Task 14: 401 응답 시 1회 재발급 + 재시도

**Files:**
- Modify: `src/services/api.ts` response interceptor

- [ ] **Step 1: Extend response interceptor**

기존 `api.interceptors.response.use(...)` 내부에 401 + `SESSION_TOKEN_EXPIRED` 케이스 처리 추가:
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.code;
    if (
      error.response?.status === 401 &&
      (code === 'SESSION_TOKEN_EXPIRED' || code === 'SESSION_TOKEN_REQUIRED') &&
      !original._retriedAfterRefresh
    ) {
      original._retriedAfterRefresh = true;
      // SessionTokenProvider 가 refresh 하도록 트리거(이벤트로 분리)
      window.dispatchEvent(new Event('session-token:force-refresh'));
      // 새 토큰이 들어올 때까지 짧게 대기
      await new Promise((r) => setTimeout(r, 1500));
      return api(original);
    }
    // 기존 인증 에러 처리...
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: Listen to event in SessionTokenContext**

`src/context/SessionTokenContext.tsx` 의 `SessionTokenProvider` 안에 추가:
```tsx
useEffect(() => {
  const handler = () => forceRefresh();
  window.addEventListener('session-token:force-refresh', handler);
  return () => window.removeEventListener('session-token:force-refresh', handler);
}, [forceRefresh]);
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

---

### Task 15: `App.tsx` 에 Provider 래핑

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap routes with SessionTokenProvider**

`src/App.tsx` 최상위 트리에 `<SessionTokenProvider>` 추가. `AuthProvider`, `ToastProvider`, `ThemeProvider`, `LanguageProvider` 와 같은 레벨로. 위치는 `LanguageProvider` 안쪽, `Router` 바깥쪽으로 (모든 페이지에서 토큰 사용 가능하도록):
```tsx
<LanguageProvider>
  <SessionTokenProvider>
    <AuthProvider>
      <Router>
        ...
      </Router>
    </AuthProvider>
  </SessionTokenProvider>
</LanguageProvider>
```
실제 기존 구조에 맞춰 정확한 위치 조정.

- [ ] **Step 2: Run dev server**

```bash
npm start
```
브라우저에서 홈 → DevTools Network 탭 → `auth/session-token` 호출이 한 번 일어나고 `session_token` 응답을 받는지 확인. 이후 다른 API 호출(예: QuickAccess 목록)에 `X-Session-Token` 헤더가 들어가는지 확인.

- [ ] **Step 3: Checkpoint**

Phase 2 (Task 11~15) 완료. 보안 인프라가 켜졌고 기존 페이지들은 여전히 정상 동작해야 함.

---

## Phase 3 — Unified File Box + 기본 만료시간 UI

### Task 16: `recentSessions.ts` 유틸 + 단위 테스트

**Files:**
- Create: `src/utils/recentSessions.ts`
- Create: `src/utils/__tests__/recentSessions.test.ts`

- [ ] **Step 1: Write failing test**

`src/utils/__tests__/recentSessions.test.ts`:
```typescript
import { pushSession, listSessions, RecentSession } from '../recentSessions';

beforeEach(() => localStorage.clear());

describe('recentSessions', () => {
  it('returns empty array when nothing stored', () => {
    expect(listSessions()).toEqual([]);
  });

  it('pushes and lists a session', () => {
    const s: RecentSession = {
      code: '123456',
      fileNames: ['a.pdf'],
      totalSize: 1024,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    pushSession(s);
    expect(listSessions()).toEqual([s]);
  });

  it('LRU caps at 10', () => {
    for (let i = 0; i < 12; i++) {
      pushSession({ code: String(i).padStart(6, '0'), fileNames: ['x'], totalSize: 1, expiresAt: new Date(Date.now()+60000).toISOString(), createdAt: new Date().toISOString() });
    }
    expect(listSessions()).toHaveLength(10);
    expect(listSessions()[0].code).toBe('000011'); // 가장 최근이 맨 앞
  });

  it('filters out expired entries', () => {
    pushSession({ code: '111111', fileNames: ['x'], totalSize: 1, expiresAt: new Date(Date.now()-1000).toISOString(), createdAt: new Date().toISOString() });
    expect(listSessions()).toEqual([]);
  });

  it('recovers from corrupt JSON', () => {
    localStorage.setItem('recentSessions', '<<not json>>');
    expect(listSessions()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test (fails)**

```bash
npm test -- --watchAll=false src/utils/__tests__/recentSessions.test.ts
```
Expected: 모듈 미정의 에러.

- [ ] **Step 3: Implement util**

`src/utils/recentSessions.ts`:
```typescript
const KEY = 'recentSessions';
const MAX = 10;

export interface RecentSession {
  code: string;
  fileNames: string[];
  totalSize: number;
  expiresAt: string; // ISO8601
  createdAt: string; // ISO8601
}

const readAll = (): RecentSession[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (list: RecentSession[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
};

export const listSessions = (): RecentSession[] => {
  const now = Date.now();
  return readAll().filter((s) => new Date(s.expiresAt).getTime() > now);
};

export const pushSession = (s: RecentSession): void => {
  const existing = readAll().filter((x) => x.code !== s.code);
  const next = [s, ...existing].slice(0, MAX);
  writeAll(next);
};

export const clearSessions = (): void => {
  try { localStorage.removeItem(KEY); } catch {}
};
```

- [ ] **Step 4: Run test (passes)**

```bash
npm test -- --watchAll=false src/utils/__tests__/recentSessions.test.ts
```
Expected: 모두 통과.

- [ ] **Step 5: Checkpoint**

---

### Task 17: `useMultipartUpload` 훅 추출

**Files:**
- Create: `src/hooks/useMultipartUpload.ts`
- Modify: `src/context/QuickAccessUploadContext.tsx` (로직 위임)

> 목표: 멀티파트 업로드 파이프라인(`runConcurrent`, 진행률 트래킹, 부분 실패 처리)을 순수 훅으로 추출해 `QuickAccessUploadContext` 와 새 `UnifiedFileBox` 가 공유한다. 기존 외부 동작은 변경하지 않는다.

- [ ] **Step 1: Define hook surface**

`src/hooks/useMultipartUpload.ts`:
```typescript
import { useRef, useCallback } from 'react';
import { quickAccessAPI, fileAPI, workerAPI } from '../services/api';
import { getDeviceInfo, getImageDimensions } from '../utils/format';

export type UploadMode = 'quick-access' | 'public';

export interface UploadProgressEvent {
  fileIndex: number;
  fileName: string;
  fileSize: number;
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface CompletedSessionResult {
  upload_session_id: string;
  share_code: string;
  expires_at: string;
  file_count: number;
  total_size: number;
}

export interface UseMultipartUploadOptions {
  mode: UploadMode;
  onProgress?: (events: UploadProgressEvent[]) => void;
  onFileComplete?: (fileIndex: number) => void;
}

export interface StartUploadInput {
  files: File[];
  description?: string;
  password?: string;
}

export interface UploadHandle {
  abort: () => void;
  promise: Promise<CompletedSessionResult>;
}

export interface UseMultipartUploadResult {
  startUpload: (input: StartUploadInput) => UploadHandle;
}

export const useMultipartUpload = (opts: UseMultipartUploadOptions): UseMultipartUploadResult => {
  // Implementation extracted from QuickAccessUploadContext.handleUpload
  // (Reuses CHUNK_SIZE=50MB, MAX_CONCURRENT_UPLOADS=10, MAX_CONCURRENT_FILES=4,
  //  DIRECT_UPLOAD_THRESHOLD=100MB.)
  // Returns { startUpload }. startUpload returns { abort, promise }.
  ...
};
```

본문은 `src/context/QuickAccessUploadContext.tsx:147-345` 의 `handleUpload` 함수에서:
- `quickAccessAPI.initUpload` (인증 사용자만) vs `fileAPI.initMultipartUpload` (공개) 분기를 `mode` 에 따라 선택
- 진행률 콜백을 외부로 위임
- AbortController 를 호출자가 받을 수 있게 반환

상세 코드 이식은 기존 함수의 본문을 거의 1:1 로 옮기는 작업. 외부 시그니처(`onProgress`, `onFileComplete`) 와 내부 데이터(`fileTrackingMap`, `controllers`) 만 새 위치로.

- [ ] **Step 2: Add unit test (skeleton)**

`src/hooks/__tests__/useMultipartUpload.test.ts` — axios mock 으로 init/presign/upload 응답을 stub. 정상 케이스, abort, 부분 실패 3가지 시나리오. (시간 제약 시 추후 작업으로 비워두지 말고, 정상 케이스 1개만이라도 통과시킨다.)

- [ ] **Step 3: Refactor QuickAccessUploadContext to delegate**

`src/context/QuickAccessUploadContext.tsx` 의 `handleUpload` 본문을 다음과 같이 축소:
```typescript
const uploader = useMultipartUpload({
  mode: 'quick-access',
  onProgress: (events) => { /* setUploadingFiles 의 progress/timeRemaining 갱신 */ },
  onFileComplete: (idx) => { /* setUploadingFiles map */ },
});

const handleUpload = useCallback(async (droppedFiles: File[]) => {
  const { promise } = uploader.startUpload({ files: droppedFiles });
  try {
    const result = await promise;
    toast.success(t('quickAccess.uploadComplete'));
    setCompletedCounter((c) => c + 1);
  } catch (e: any) {
    if (!(e?.name === 'CanceledError')) toast.error(t('quickAccess.uploadFailed'));
  } finally {
    setUploadingFiles([]);
  }
}, [uploader, t]);
```
**외부 행동 동일**: QuickAccess 의 UI 동작이 그대로여야 함.

- [ ] **Step 4: Type check + manual smoke test**

```bash
npx tsc --noEmit
npm start
```
브라우저에서 QuickAccess 로그인 사용자 파일 드롭 → 진행률/완료/취소가 종전과 동일하게 동작하는지 확인.

- [ ] **Step 5: Checkpoint**

---

### Task 18: 박스 상태 reducer + 테스트

**Files:**
- Create: `src/components/UnifiedFileBox/useUnifiedFileBoxState.ts`
- Create: `src/components/UnifiedFileBox/__tests__/reducer.test.ts`

- [ ] **Step 1: Write failing test**

`src/components/UnifiedFileBox/__tests__/reducer.test.ts`:
```typescript
import { reducer, initialState, BoxState } from '../useUnifiedFileBoxState';

const mk = (overrides: Partial<any> = {}) => ({ ...initialState, ...overrides });

describe('UnifiedFileBox reducer', () => {
  it('idle upload + drop → uploading', () => {
    const s = reducer(mk(), { type: 'drop', files: [new File([''], 'a.pdf')] });
    expect(s.state).toBe('uploading');
    expect(s.files).toHaveLength(1);
  });

  it('uploading + complete → success', () => {
    const s = reducer(mk({ state: 'uploading' }), { type: 'completeAll', result: { code: '123456', fileNames: ['a'], totalSize: 1, expiresAt: 'iso', createdAt: 'iso' } });
    expect(s.state).toBe('success');
    expect(s.lastResult?.code).toBe('123456');
  });

  it('success + confirm → recent', () => {
    const s = reducer(mk({ state: 'success' }), { type: 'confirm' });
    expect(s.state).toBe('recent');
  });

  it('toggle download from any upload state preserves files but switches mode', () => {
    const s = reducer(mk({ state: 'success' }), { type: 'switchMode', mode: 'download' });
    expect(s.mode).toBe('download');
    expect(s.state).toBe('idleDownload');
  });

  it('drop replaces state regardless of current state', () => {
    const before = mk({ state: 'success', lastResult: { code: 'x', fileNames:['x'], totalSize:1, expiresAt:'iso', createdAt:'iso' } });
    const after = reducer(before, { type: 'drop', files: [new File([''], 'b.txt')] });
    expect(after.state).toBe('uploading');
  });

  it('uploading ignores toggle clicks', () => {
    const before = mk({ state: 'uploading' });
    const after = reducer(before, { type: 'switchMode', mode: 'download' });
    expect(after.state).toBe('uploading');
    expect(after.mode).toBe('upload');
  });
});
```

- [ ] **Step 2: Run test (fails)**

```bash
npm test -- --watchAll=false src/components/UnifiedFileBox/__tests__/reducer.test.ts
```

- [ ] **Step 3: Implement reducer**

`src/components/UnifiedFileBox/useUnifiedFileBoxState.ts`:
```typescript
import { useReducer } from 'react';
import { RecentSession } from '../../utils/recentSessions';

export type Mode = 'upload' | 'download';
export type BoxState = 'idleUpload' | 'idleDownload' | 'uploading' | 'success' | 'recent';

export interface State {
  mode: Mode;
  state: BoxState;
  files: File[];
  lastResult: RecentSession | null;
  uploadFailures: string[]; // failed file names
}

export type Action =
  | { type: 'drop'; files: File[] }
  | { type: 'cancelUpload' }
  | { type: 'completeAll'; result: RecentSession }
  | { type: 'completePartial'; result: RecentSession; failedNames: string[] }
  | { type: 'failAll' }
  | { type: 'confirm' }
  | { type: 'switchMode'; mode: Mode }
  | { type: 'close' /* recent → idleUpload */ };

export const initialState: State = {
  mode: 'upload',
  state: 'idleUpload',
  files: [],
  lastResult: null,
  uploadFailures: [],
};

export const reducer = (s: State, a: Action): State => {
  switch (a.type) {
    case 'drop':
      if (s.mode !== 'upload') return s;
      return { ...s, state: 'uploading', files: a.files, lastResult: null, uploadFailures: [] };
    case 'cancelUpload':
      return { ...s, state: 'idleUpload', files: [] };
    case 'completeAll':
      return { ...s, state: 'success', lastResult: a.result, uploadFailures: [] };
    case 'completePartial':
      return { ...s, state: 'success', lastResult: a.result, uploadFailures: a.failedNames };
    case 'failAll':
      return { ...s, state: 'idleUpload', files: [], uploadFailures: [] };
    case 'confirm':
      return { ...s, state: 'recent' };
    case 'close':
      return { ...s, state: 'idleUpload', files: [] };
    case 'switchMode':
      if (s.state === 'uploading') return s; // tabs disabled
      if (a.mode === 'download') return { ...s, mode: 'download', state: 'idleDownload' };
      // mode → upload: 마지막 업로드 모드 상태 복원
      const restored: BoxState =
        s.lastResult ? (s.state === 'recent' ? 'recent' : 'success') : 'idleUpload';
      return { ...s, mode: 'upload', state: restored };
  }
};

export const useUnifiedFileBoxState = () => useReducer(reducer, initialState);
```

- [ ] **Step 4: Run test (passes)**

```bash
npm test -- --watchAll=false src/components/UnifiedFileBox/__tests__/reducer.test.ts
```

- [ ] **Step 5: Checkpoint**

---

### Task 19: `ModeHeader` 컴포넌트

**Files:**
- Create: `src/components/UnifiedFileBox/ModeHeader.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { Mode } from './useUnifiedFileBoxState';
import { cn } from 'lib/utils';

interface Props {
  mode: Mode;
  disabled: boolean;
  onSwitchMode: (m: Mode) => void;
  onDrillDownToUpload: () => void; // 업로드 활성 상태에서 활성 탭 재클릭
}

const ModeHeader: React.FC<Props> = ({ mode, disabled, onSwitchMode, onDrillDownToUpload }) => {
  const { t } = useTranslation();
  const tab = (which: Mode, label: string) => {
    const active = mode === which;
    const handle = () => {
      if (disabled) return;
      if (active && which === 'upload') onDrillDownToUpload();
      else onSwitchMode(which);
    };
    return (
      <button
        role="tab"
        aria-selected={active}
        disabled={disabled}
        onClick={handle}
        className={cn(
          'flex-1 py-3 text-center font-semibold transition-colors',
          'border-b-2',
          active ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent can-hover:hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="inline-flex items-center justify-center">
          {label}
          {active && which === 'upload' && (
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          )}
        </span>
      </button>
    );
  };

  return (
    <div role="tablist" className="flex">
      {tab('upload', t('unifiedBox.tabUpload'))}
      {tab('download', t('unifiedBox.tabDownload'))}
    </div>
  );
};

export default ModeHeader;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 20: `IdleUpload` 뷰

**Files:**
- Create: `src/components/UnifiedFileBox/IdleUpload.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface Props {
  defaultExpirationLabel: string; // already-translated duration like "30분"
}

const IdleUpload: React.FC<Props> = ({ defaultExpirationLabel }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <ArrowUpTrayIcon className="w-12 h-12 text-primary mb-4" strokeWidth={2.5} />
      <p className="text-foreground font-medium">{t('unifiedBox.uploadHint')}</p>
      <p className="text-xs text-muted-foreground mt-3">
        {t('unifiedBox.defaultExpiration', { duration: defaultExpirationLabel })}
        {' · '}
        {isAuthenticated ? (
          <Link to="/settings" className="underline can-hover:hover:text-foreground">{t('unifiedBox.changeDefault')}</Link>
        ) : (
          <Link to="/signin" className="underline can-hover:hover:text-foreground">{t('unifiedBox.loginToChange')}</Link>
        )}
      </p>
    </div>
  );
};

export default IdleUpload;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 21: `IdleDownload` 뷰 — 6자리 코드 입력

**Files:**
- Create: `src/components/UnifiedFileBox/IdleDownload.tsx`

- [ ] **Step 1: Extract reusable input**

`pages/HomePage.tsx:81-115` 의 6자리 입력 위젯을 이 컴포넌트로 그대로 이식. `useNavigate` 사용.

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Input } from '../ui/input';
import { useTranslation } from '../../i18n';

const IdleDownload: React.FC<{ shortcutEnabled: boolean }> = ({ shortcutEnabled }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcutEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcutEnabled]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length <= 6) setCode(v);
  };

  const go = () => { if (code.length === 6) navigate(`/download/${code}`); };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <p className="text-foreground font-medium mb-6">{t('unifiedBox.downloadHint')}</p>
      <div className="w-full max-w-sm relative">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={onChange}
          onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
          placeholder="123456"
          className="w-full h-auto px-5 py-3 pr-12 bg-card placeholder:text-muted-foreground/50 rounded-xl text-center font-mono text-base md:text-lg"
          maxLength={6}
          aria-label={t('unifiedBox.downloadHint')}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={go}
              disabled={code.length !== 6}
              className={`absolute right-[5.5px] top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                code.length === 6
                  ? 'bg-primary text-primary-foreground can-hover:hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('home.downloadButton')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default IdleDownload;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 22: `Uploading` 뷰 — 진행률 행

**Files:**
- Create: `src/components/UnifiedFileBox/Uploading.tsx`

- [ ] **Step 1: Implement using QuickAccess progress markup**

`components/QuickAccess.tsx:304-353` 의 마크업을 그대로 이식. props 로 `uploadingFiles: UploadingFile[]`, `onCancel(id)` 받는다.

```tsx
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import FileThumbnail from '../FileThumbnail';
import { formatFileSize } from '../../utils/format';
import { useTranslation } from '../../i18n';

export interface UploadingItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  timeRemaining: string;
  completed: boolean;
}

interface Props {
  items: UploadingItem[];
  onCancel: (id: string) => void;
}

const Uploading: React.FC<Props> = ({ items, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {items.map((uf) => (
        <div key={uf.id} className="flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09]">
          <div className="flex-shrink-0 mr-3">
            <FileThumbnail source={null} fileName={uf.fileName} size="sm" />
          </div>
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-sm font-medium text-foreground truncate">{uf.fileName}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{formatFileSize(uf.fileSize)}</span>
              <div className="flex items-center gap-2">
                {uf.completed ? (
                  <span className="text-xs text-muted-foreground">{t('upload.pleaseWait')}</span>
                ) : (
                  <>
                    {uf.timeRemaining && <span className="text-xs text-muted-foreground">{uf.timeRemaining}</span>}
                    <span className="text-xs font-semibold text-primary">{uf.progress}%</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center h-4 mt-0.5">
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${uf.progress}%` }} />
              </div>
            </div>
          </div>
          {!uf.completed && (
            <button
              onClick={() => onCancel(uf.id)}
              className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:bg-foreground/10"
              title={t('common.cancel')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Uploading;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 23: `UploadSuccess` 뷰

**Files:**
- Create: `src/components/UnifiedFileBox/UploadSuccess.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import CopyButton from '../CopyButton';
import { toast } from '../../context/ToastContext';
import { RecentSession } from '../../utils/recentSessions';

interface Props {
  result: RecentSession;
  failedNames: string[];
  onConfirm: () => void;
  onRetry: () => void;
}

const UploadSuccess: React.FC<Props> = ({ result, failedNames, onConfirm, onRetry }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const url = `${window.location.origin}/download/${result.code}`;
  const minutesLeft = Math.max(1, Math.round((new Date(result.expiresAt).getTime() - Date.now()) / 60000));
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <CheckCircleIcon className="w-12 h-12 text-primary mb-3" />
      <p className="text-foreground font-semibold mb-4">{t('unifiedBox.uploadComplete')}</p>
      <div className="inline-flex items-center rounded-[10px] pl-3 pr-1.5 py-[7px]" style={{
        background: 'var(--share-bubble-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'var(--share-bubble-shadow)',
        border: '1px solid var(--share-bubble-border)',
      }}>
        <span className="font-mono text-[1.125rem] font-bold text-foreground tracking-[0.06em] leading-none">
          {result.code.slice(0, 3)}<span className="inline-block w-1" />{result.code.slice(3)}
        </span>
        <CopyButton value={url} defaultCopied={false} stopPropagation
          onCopied={() => toast.success(t('quickAccess.shareSuccess'))}
          className="ml-2 p-1.5 can-hover:hover:bg-foreground/10" iconClassName="w-4 h-4"
          iconCopiedClass="text-green-600 dark:text-green-400" />
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {t('unifiedBox.fileCountSummary', { count: result.fileNames.length, duration: t('unifiedBox.remainingMinutes', { minutes: minutesLeft }) })}
      </p>
      {failedNames.length > 0 && (
        <div className="mt-3 text-xs text-red-600 dark:text-red-400 text-center">
          {t('unifiedBox.partialFailure', { count: failedNames.length })}
          <ul className="my-1">{failedNames.map((n) => <li key={n}>{n}</li>)}</ul>
          <Button size="sm" variant="outline" onClick={onRetry}>{t('unifiedBox.retry')}</Button>
        </div>
      )}
      <div className="flex gap-2 mt-5">
        <Button onClick={onConfirm}>{t('unifiedBox.confirmButton')}</Button>
        <Button variant="outline" onClick={() => navigate('/upload/success', { state: { uploadResult: { share_code: result.code, expires_at: result.expiresAt } } })}>
          {t('unifiedBox.qrAndDetails')}
        </Button>
      </div>
    </div>
  );
};

export default UploadSuccess;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 24: `RecentSessions` 뷰

**Files:**
- Create: `src/components/UnifiedFileBox/RecentSessions.tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { listSessions, RecentSession } from '../../utils/recentSessions';
import { formatFileSize } from '../../utils/format';
import FileThumbnail from '../FileThumbnail';

const RecentSessions: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<RecentSession[]>([]);
  useEffect(() => { setItems(listSessions()); }, [refreshKey]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-10 text-sm text-muted-foreground">
        {t('unifiedBox.recentEmpty')}
      </div>
    );
  }

  const copy = async (s: RecentSession) => {
    const expired = new Date(s.expiresAt).getTime() <= Date.now();
    if (expired) {
      toast.error(t('unifiedBox.expiredCodeToast'));
      return;
    }
    const url = `${window.location.origin}/download/${s.code}`;
    await navigator.clipboard.writeText(url);
    toast.success(t('quickAccess.shareSuccess'));
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h4 className="text-sm font-semibold text-foreground">{t('unifiedBox.recentTitle')}</h4>
        {isAuthenticated && (
          <Link to="/history" className="text-xs text-muted-foreground can-hover:hover:text-foreground underline">
            {t('unifiedBox.viewAll')} →
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2">
        {items.map((s) => {
          const minLeft = Math.round((new Date(s.expiresAt).getTime() - Date.now()) / 60000);
          const expired = minLeft <= 0;
          return (
            <button key={s.code} onClick={() => copy(s)}
              className={`w-full flex items-center px-3 py-2.5 bg-muted rounded-lg border border-foreground/[0.09] can-hover:hover:bg-accent text-left ${expired ? 'opacity-50' : ''}`}>
              <div className="flex-shrink-0 mr-3">
                <FileThumbnail source={null} fileName={s.fileNames[0] || 'file'} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {s.fileNames[0]}{s.fileNames.length > 1 ? ` 외 ${s.fileNames.length - 1}개` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{s.code.slice(0,3)} · {s.code.slice(3)}</span>
                  {' · '}
                  {formatFileSize(s.totalSize)}
                  {' · '}
                  {expired ? t('unifiedBox.expired') : t('unifiedBox.remainingMinutes', { minutes: minLeft })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSessions;
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

---

### Task 25: `UnifiedFileBox/index.tsx` — 통합

**Files:**
- Create: `src/components/UnifiedFileBox/index.tsx`

- [ ] **Step 1: Implement container**

```tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useMultipartUpload, UploadProgressEvent } from '../../hooks/useMultipartUpload';
import { pushSession, RecentSession } from '../../utils/recentSessions';
import { useUnifiedFileBoxState } from './useUnifiedFileBoxState';
import ModeHeader from './ModeHeader';
import IdleUpload from './IdleUpload';
import IdleDownload from './IdleDownload';
import Uploading, { UploadingItem } from './Uploading';
import UploadSuccess from './UploadSuccess';
import RecentSessions from './RecentSessions';
import { userAPI } from '../../services/api';
import { formatExpirationDuration } from '../../utils/format';
import { toast } from '../../context/ToastContext';
import { cn } from 'lib/utils';

const UnifiedFileBox: React.FC = () => {
  const { t, language } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useUnifiedFileBoxState();
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const handleRef = useRef<{ abort: () => void } | null>(null);
  const [defaultExp, setDefaultExp] = useState<string>('thirty_minutes');

  useEffect(() => {
    if (!isAuthenticated) return;
    userAPI.getSettings().then((s) => setDefaultExp(s.default_expiration)).catch(() => {});
  }, [isAuthenticated]);

  const uploader = useMultipartUpload({
    mode: isAuthenticated ? 'quick-access' : 'public',
    onProgress: (events: UploadProgressEvent[]) => {
      setItems((prev) => prev.map((it, idx) => {
        const e = events[idx];
        if (!e) return it;
        return { ...it, progress: e.percent };
      }));
    },
    onFileComplete: (idx) => {
      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, completed: true, progress: 100 } : it));
    },
  });

  const startUpload = useCallback((files: File[]) => {
    handleRef.current?.abort();
    dispatch({ type: 'drop', files });
    setItems(files.map((f, i) => ({
      id: `u-${Date.now()}-${i}`, fileName: f.name, fileSize: f.size,
      progress: 0, timeRemaining: '', completed: false,
    })));
    const handle = uploader.startUpload({ files });
    handleRef.current = handle;
    handle.promise.then((result) => {
      const session: RecentSession = {
        code: result.share_code,
        fileNames: files.map((f) => f.name),
        totalSize: files.reduce((s, f) => s + f.size, 0),
        expiresAt: result.expires_at,
        createdAt: new Date().toISOString(),
      };
      pushSession(session);
      setRecentRefreshKey((k) => k + 1);
      dispatch({ type: 'completeAll', result: session });
    }).catch((err) => {
      if (err?.name === 'CanceledError') return;
      toast.error(t('upload.uploadFailed'));
      dispatch({ type: 'failAll' });
    }).finally(() => { handleRef.current = null; });
  }, [dispatch, uploader, t]);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length === 0) return;
    startUpload(accepted);
  }, [startUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: true, noClick: state.state === 'uploading',
  });

  const onCancelItem = (id: string) => {
    handleRef.current?.abort();
    dispatch({ type: 'cancelUpload' });
    setItems([]);
  };

  const onDrillDown = () => {
    navigate('/upload', { state: { initialFiles: state.files, fromUnifiedBox: true } });
  };

  const tabsDisabled = state.state === 'uploading';

  return (
    <div {...getRootProps()}
      className={cn(
        'bg-card border-[3px] border-foreground/[0.09] rounded-2xl overflow-hidden flex flex-col',
        'min-h-[280px] md:min-h-[380px]',
        isDragActive && 'border-primary bg-primary/5 cursor-copy',
      )}>
      <input {...getInputProps()} />
      <ModeHeader
        mode={state.mode}
        disabled={tabsDisabled}
        onSwitchMode={(m) => dispatch({ type: 'switchMode', mode: m })}
        onDrillDownToUpload={onDrillDown}
      />
      <div className="border-t border-foreground/[0.09] flex-1 flex flex-col" role="tabpanel">
        {state.mode === 'upload' && state.state === 'idleUpload' && (
          <IdleUpload defaultExpirationLabel={formatExpirationDuration(defaultExp, language)} />
        )}
        {state.mode === 'upload' && state.state === 'uploading' && (
          <Uploading items={items} onCancel={onCancelItem} />
        )}
        {state.mode === 'upload' && state.state === 'success' && state.lastResult && (
          <UploadSuccess
            result={state.lastResult}
            failedNames={state.uploadFailures}
            onConfirm={() => dispatch({ type: 'confirm' })}
            onRetry={() => startUpload(state.files.filter((f) => state.uploadFailures.includes(f.name)))}
          />
        )}
        {state.mode === 'upload' && state.state === 'recent' && (
          <RecentSessions refreshKey={recentRefreshKey} />
        )}
        {state.mode === 'download' && (
          <IdleDownload shortcutEnabled />
        )}
      </div>
    </div>
  );
};

export default UnifiedFileBox;
```

- [ ] **Step 2: Add `formatExpirationDuration` helper (if missing)**

`src/utils/format.ts` 에 다음 함수가 없으면 추가:
```typescript
export const formatExpirationDuration = (key: string, language: string): string => {
  const map: Record<string, [number, 'min' | 'hour']> = {
    five_minutes: [5, 'min'], thirty_minutes: [30, 'min'], one_hour: [1, 'hour'],
    three_hours: [3, 'hour'], six_hours: [6, 'hour'],
    twelve_hours: [12, 'hour'], twenty_four_hours: [24, 'hour'],
  };
  const v = map[key];
  if (!v) return key;
  // 기존 t('format.5min') 등을 활용하는 방식으로 i18n 처리해도 됨
  return v[1] === 'min' ? `${v[0]}분` : `${v[0]}시간`;
};
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Checkpoint**

---

### Task 26: `HomePage.tsx` — 2카드 제거 + UnifiedFileBox 삽입

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Replace card grid**

`src/pages/HomePage.tsx` 의 `<div className="max-w-5xl mx-auto px-4 pb-20">` 내부 `<div className="grid md:grid-cols-2 gap-8">...</div>` 전체를 다음으로 교체:
```tsx
<div className="max-w-5xl mx-auto px-4 pb-20">
  <UnifiedFileBox />
</div>
```
6자리 입력 로직(`downloadCode`, `handleDownload`, `handleCodeChange`, 단축키 `useEffect`, `downloadCodeInputRef`)는 모두 `IdleDownload` 로 이동했으므로 본 파일에서 삭제. `useState`, `useRef`, `Card`, `Input`, `Tooltip`, `ArrowUpTrayIcon`, `ArrowDownTrayIcon` 등 미사용 import 도 정리.

- [ ] **Step 2: Manual visual check**

```bash
npm start
```
홈에서 QuickAccess 위쪽, 그 아래 1단 UnifiedFileBox. 업로드 탭이 기본 활성, 밑변 underline 표시. `›` 아이콘 노출. 다운로드 탭 클릭 시 6자리 입력으로 전환.

- [ ] **Step 3: Drag a file → auto upload starts**

브라우저에서 파일 드롭 → 즉시 진행률 행이 표시되고 완료되면 인라인 성공 뷰. `확인` 클릭 → 최근 목록 표시.

- [ ] **Step 4: Checkpoint**

---

### Task 27: i18n 키 5개 파일 동시 갱신

**Files:**
- Modify: `src/i18n/ko.json`, `en.json`, `ja.json`, `zh-CN.json`, `zh-TW.json`

- [ ] **Step 1: Add unifiedBox keys (Korean)**

각 JSON 파일의 최상위에 `unifiedBox` 객체와 `settings.defaultExpiration*` 키를 스펙(섹션 7)의 한국어 예시대로 추가. 영어/일본어/중국어 번역은 다음 매핑으로 작성:

| key | en | ja | zh-CN | zh-TW |
|---|---|---|---|---|
| tabUpload | Upload | アップロード | 上传 | 上傳 |
| tabDownload | Download | ダウンロード | 下载 | 下載 |
| uploadHint | Drag a file or click to select | ファイルをドラッグまたはクリックして選択 | 拖放或点击选择文件 | 拖放或點擊選擇檔案 |
| downloadHint | Enter the 6-digit code | 6桁のコードを入力 | 输入6位代码 | 輸入6位代碼 |
| defaultExpiration | Expires in {duration} by default | デフォルト有効期限 {duration} | 默认有效期 {duration} | 預設有效期 {duration} |
| changeDefault | Change | 変更 | 更改 | 變更 |
| loginToChange | Log in to change | ログインして変更 | 登录以更改 | 登入以變更 |
| uploadComplete | Upload complete | アップロード完了 | 上传完成 | 上傳完成 |
| fileCountSummary | {count} files · expires in {duration} | {count}個のファイル · {duration}後に期限切れ | {count}个文件 · {duration}后过期 | {count}個檔案 · {duration}後過期 |
| confirmButton | Done | 確認 | 确认 | 確認 |
| qrAndDetails | QR · Details | QR · 詳細 | 二维码 · 详情 | 二維碼 · 詳情 |
| recentTitle | Recent shares | 最近の共有 | 最近的分享 | 最近的分享 |
| viewAll | View all | すべて見る | 查看全部 | 查看全部 |
| recentEmpty | No shares yet | 共有されたファイルがありません | 暂无分享 | 尚無分享 |
| expired | Expired | 期限切れ | 已过期 | 已過期 |
| remainingMinutes | {minutes} min left | あと{minutes}分 | 剩余{minutes}分钟 | 剩餘{minutes}分鐘 |
| retry | Retry | 再試行 | 重试 | 重試 |
| partialFailure | {count} file(s) failed to upload | {count}個のファイルがアップロードに失敗 | {count}个文件上传失败 | {count}個檔案上傳失敗 |
| expiredCodeToast | This code has expired | このコードは期限切れです | 此代码已过期 | 此代碼已過期 |
| sessionTokenFailed | Security check failed. Please refresh. | セキュリティ確認に失敗しました。再読み込みしてください。 | 安全验证失败,请刷新页面 | 安全驗證失敗,請重新整理 |

settings 영역:
| key | en | ja | zh-CN | zh-TW |
|---|---|---|---|---|
| defaultExpirationLabel | Default expiration | デフォルト有効期限 | 默认有效期 | 預設有效期 |
| defaultExpirationDescription | Applied to fast uploads from the home page | ホーム画面でのクイックアップロード時に適用 | 在主页快速上传时应用 | 在首頁快速上傳時套用 |
| defaultExpirationSaved | Default expiration saved | デフォルト有効期限を保存しました | 默认有效期已保存 | 預設有效期已儲存 |

- [ ] **Step 2: Verify i18n loads**

```bash
npm start
```
언어 토글 전환 시 박스 라벨이 즉시 바뀌는지 확인.

- [ ] **Step 3: Checkpoint**

---

### Task 28: SettingsPage 에 기본 만료시간 select 추가

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Identify settings section**

`src/pages/SettingsPage.tsx` 의 알림 설정 섹션(notify_upload 등) 근처에 새 섹션 추가. 정확한 위치는 기존 섹션 구조에 맞춰 결정.

- [ ] **Step 2: Add select control**

```tsx
<section className="...">
  <h3>{t('settings.defaultExpirationLabel')}</h3>
  <p className="text-sm text-muted-foreground">{t('settings.defaultExpirationDescription')}</p>
  <select
    value={settings.default_expiration}
    onChange={async (e) => {
      const next = e.target.value as ExpirationOption;
      const prev = settings.default_expiration;
      setSettings({ ...settings, default_expiration: next });
      try {
        await userAPI.updateSettings({ ...settings, default_expiration: next });
        toast.success(t('settings.defaultExpirationSaved'));
      } catch {
        setSettings({ ...settings, default_expiration: prev });
        toast.error(t('settings.saveFailed'));
      }
    }}
  >
    <option value="five_minutes">{t('format.5min')}</option>
    <option value="thirty_minutes">{t('format.30min')}</option>
    <option value="one_hour">{t('format.1hour')}</option>
    <option value="three_hours">{t('format.3hours')}</option>
    <option value="six_hours">{t('format.6hours')}</option>
    <option value="twelve_hours">{t('format.12hours')}</option>
    <option value="twenty_four_hours">{t('format.24hours')}</option>
  </select>
</section>
```
`settings` 상태가 새 필드를 포함하도록 타입 캐스팅 및 초기 fetch 결과 처리도 확인.

- [ ] **Step 3: Manual verification**

설정 페이지에서 30분 → 1시간 변경 → 토스트 → 새로고침 후 그대로 1시간. 홈으로 가서 박스의 "기본 만료" 라벨이 1시간으로 표시.

- [ ] **Step 4: Checkpoint**

---

### Task 29: `UploadPage.tsx` — `initialFiles` 수용

**Files:**
- Modify: `src/pages/UploadPage.tsx:43-44, 169-179`

- [ ] **Step 1: Read initialFiles from location.state**

기존 `fallbackFiles` 패턴 옆에 `initialFiles` 도 처리:
```typescript
const initialFiles = location.state?.initialFiles as File[] | undefined;
const fromUnifiedBox = location.state?.fromUnifiedBox as boolean | undefined;

useEffect(() => {
  if (fromUnifiedBox && initialFiles && initialFiles.length > 0 && !fallbackHandledRef.current) {
    fallbackHandledRef.current = true;
    setFiles(initialFiles);
    window.history.replaceState({}, document.title);
  }
}, [fromUnifiedBox, initialFiles]);
```

- [ ] **Step 2: Manual verification**

홈 박스에서 파일 드롭 후 진행률이 보이는 도중 — 단, ">" disabled 인지 확인. 박스가 idleUpload 상태일 때 ">" 클릭 → `/upload` 페이지로 이동 후 박스에 있던 파일이 인계되는지 확인. (파일이 없는 idleUpload 에서 ">" 클릭은 빈 /upload 페이지로 이동.)

- [ ] **Step 3: Checkpoint**

---

## Phase 4 — 프론트 잔존 Turnstile UI 제거

### Task 30: Turnstile 위젯 호출처 정리

**Files:**
- Modify: `src/pages/upload/UploadProgressBar.tsx`
- Modify: `src/pages/UploadPage.tsx`
- Modify: `src/pages/DownloadFilePage.tsx`
- Modify: `src/services/api.ts`

- [ ] **Step 1: Strip Turnstile from UploadProgressBar**

`src/pages/upload/UploadProgressBar.tsx` 에서 `TurnstileWidget` 임포트와 렌더, 관련 prop 4개 (`turnstileToken`, `turnstileResetKey`, `onTurnstileVerify`, `onTurnstileError`, `onTurnstileExpire`) 모두 제거.

- [ ] **Step 2: Strip Turnstile from UploadPage**

`src/pages/UploadPage.tsx:59-60` 의 `turnstileToken`/`turnstileResetKey` state 삭제. `handleUpload` 안의 `if (!turnstileToken) { ... }` 가드 및 `turnstile_token: turnstileToken` 인자 모두 제거. `<UploadProgressBar />` props 정리. error handling 중 `setTurnstileToken('')` 모두 삭제.

- [ ] **Step 3: Strip Turnstile from DownloadFilePage**

`src/pages/DownloadFilePage.tsx` 에서 Turnstile 관련 상태/마운트/검증 코드 모두 제거. 다운로드 호출의 `X-Turnstile-Token` 헤더 인자도 삭제.

- [ ] **Step 4: Strip turnstile params from `services/api.ts`**

`src/services/api.ts` 의 모든 함수 시그니처와 호출에서 `turnstileToken` 매개변수와 `turnstile_token` 본문 필드 / `X-Turnstile-Token` 헤더 삽입 코드 삭제. 호출자 측 (위 페이지들 + 그 외)도 동시에 정리되어야 함.

- [ ] **Step 5: grep verification**

```bash
grep -rn "turnstile_token\|X-Turnstile-Token\|TurnstileWidget" src/ \
  | grep -v "src/context/SessionTokenContext.tsx" \
  | grep -v "src/components/TurnstileWidget.tsx"
```
Expected: 0건.

- [ ] **Step 6: Build**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **Step 7: Manual smoke test**

- 홈 → 자동 업로드 정상
- `/upload` 상세 페이지에서 Turnstile 위젯 사라짐, 업로드 진행/성공
- `/download/<code>` 정상 진입 + 다운로드

- [ ] **Step 8: Checkpoint**

---

## 최종 검증

### Task 31: 통합 검증

**Files:** N/A

- [ ] **Step 1: Frontend tests**

```bash
cd /Users/mingyupark/Desktop/Dev/share-anything-web
npm test -- --watchAll=false
npm run build
```

- [ ] **Step 2: Backend tests**

```bash
cd /Users/mingyupark/Desktop/Dev/share-anything
cargo build
cargo test --all
```

- [ ] **Step 3: Manual golden paths**

브라우저에서:
1. 비로그인 — 홈 진입 → DevTools Network에 `auth/session-token` 1회 호출 확인 → 파일 드롭 → 자동 업로드 → 30분 만료로 성공 → 확인 → 최근 목록 출현
2. 비로그인 — 다운로드 탭 → 위 코드 입력 → `/download/<code>` 진입 → 다운로드 성공
3. 로그인 — SettingsPage 에서 기본 만료를 1시간으로 변경 → 홈 박스의 라벨이 "1시간" 으로 즉시 표시
4. 로그인 — 파일 드롭 → 자동 업로드 → 코드와 함께 1시간 만료가 적용됐는지 백엔드 응답에서 확인
5. 업로드 진행 중 토글이 disabled 인지, 새 파일 드롭이 즉시 진행을 abort 하고 새 세션을 시작하는지

- [ ] **Step 4: Checkpoint — full release**

모든 검증 통과 시 Phase 1~4 변경을 사용자가 일괄 검토 후 배포.

---

## 부록 — 참조 파일 좌표

- 스펙: `docs/superpowers/specs/2026-06-08-unified-file-box-design.md`
- 백엔드 메모리: `~/.claude/projects/-Users-mingyupark-Desktop-Dev-share-anything-web/memory/backend_repo.md`
- 핵심 재사용 출처:
  - QuickAccess 진행률 행: `src/components/QuickAccess.tsx:304-353`
  - share-bubble 글래스모피즘: `src/components/QuickAccess.tsx:401-466`
  - 6자리 입력 위젯 원본: `src/pages/HomePage.tsx:81-115`
  - 멀티파트 업로드 파이프라인 원본: `src/context/QuickAccessUploadContext.tsx:147-345`
