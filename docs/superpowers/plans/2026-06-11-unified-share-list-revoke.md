# 통합 공유 목록 + 코드 Revoke 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업로드 기록을 서버+로컬(익명) 병합·최신순으로 홈 박스와 /history 양쪽에 보여주고, 삭제 시 공유 코드를 revoke(서버 hard delete)하여 더 이상 다운로드되지 않게 한다. 삭제는 Undo 토스트로, 토스트가 사라질 때 커밋된다.

**Architecture:** 백엔드는 `file_shares.device_id` 컬럼 추가 + 업로드 시 X-Device-Id 저장 + `DELETE /shares/{code}`(user_id 소유 또는 device_id 일치 시 hard delete) 신규 엔드포인트. 프론트는 순수 병합 함수(`shareMerge`)와 공유 훅(`useShareList`)으로 두 화면을 통일하고, 토스트에 액션 버튼+지연 커밋(undo)을 추가한다.

**Tech Stack:** Rust/Axum + sqlx(MySQL), React 19 + TS + CRA + jest/testing-library, axios.

**레포 경로:** 프론트 `/Users/mingyupark/Desktop/Dev/share-anything-web`, 백엔드 `/Users/mingyupark/Desktop/Dev/share-anything`.

---

## 파일 구조

**백엔드 (`../share-anything`)**
- Create: `migrations/038_add_device_id_to_file_shares.sql` — device_id 컬럼.
- Modify: `src/models/file_share.rs` — FileShare에 `device_id` 필드.
- Modify: `src/db/repository.rs` — `create_file_share`에 device_id 파라미터; 신규 `delete_file_shares_by_code`.
- Modify: `src/handlers/upload.rs`, `src/handlers/presigned.rs` — 업로드 핸들러 3곳에 `HeaderMap`+device_id 전달.
- Modify: `src/handlers/download.rs` — 신규 `delete_share` 핸들러.
- Modify: `src/routes.rs` — `download_routes`에 `DELETE /shares/:code` 라우트.

**프론트 (`share-anything-web`)**
- Modify: `src/utils/recentSessions.ts` — `removeSession(code)`.
- Modify: `src/services/api.ts` — `fileAPI.revokeShare(code)`.
- Modify: `src/context/ToastContext.tsx` — 토스트 액션/커밋/duration 옵션 + `toast.action`.
- Modify: `src/components/Toast.tsx` — 액션 버튼 렌더 + 자연 소멸 시 커밋 + duration.
- Create: `src/utils/shareMerge.ts` — `groupUploads`, `mergeShares`, `MergedShare` (순수 함수, 테스트 대상).
- Create: `src/utils/__tests__/shareMerge.test.ts`.
- Create: `src/hooks/useShareList.ts` — 로컬+서버 fetch·병합·undo 삭제.
- Modify: `src/components/UnifiedFileBox/RecentShares.tsx` — 훅 사용 + 휴지통 버튼.
- Modify: `src/pages/UploadHistoryPage.tsx` — 로컬 전용 병합 + 그룹 삭제를 revoke+undo로.
- Modify: `src/i18n/{ko,en,ja,zh-CN,zh-TW}.json` — `common.undo`, `common.deleted`.

---

## Phase A — 백엔드

### Task A1: device_id 마이그레이션

**Files:**
- Create: `migrations/038_add_device_id_to_file_shares.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
ALTER TABLE file_shares
  ADD COLUMN device_id VARCHAR(64) NULL AFTER user_id;

CREATE INDEX idx_file_shares_device_id ON file_shares (device_id);
```

- [ ] **Step 2: 마이그레이션 적용**

이 프로젝트는 `src/`에 `sqlx::migrate!` 호출이 없다(런타임 자동 적용 아님). 개발 DB에 직접 적용:
Run (백엔드 디렉터리, DATABASE_URL 설정된 상태): `sqlx migrate run`
적용이 안 되면 DB 클라이언트로 위 SQL 직접 실행.
Expected: `file_shares`에 `device_id` 컬럼 존재.

- [ ] **Step 3: 컬럼 확인**

Run: `mysql ... -e "SHOW COLUMNS FROM file_shares LIKE 'device_id';"` (또는 동등한 확인)
Expected: 1 row (device_id, varchar(64), YES).

### Task A2: FileShare 모델에 device_id 추가

**Files:**
- Modify: `src/models/file_share.rs:7-29`

- [ ] **Step 1: 필드 추가**

`display_order` 다음 줄(struct 닫는 `}` 직전)에 추가:

```rust
    pub display_order: i32,
    pub device_id: Option<String>,
}
```

- [ ] **Step 2: FromRow 안전성 확인**

`device_id`는 `SELECT *` / `SELECT fs.*` 쿼리로 채워진다. FileShare를 명시적 컬럼 목록으로 채우는 `query_as::<_, FileShare>` 가 있는지 확인:
Run: `grep -rn "query_as::<_, FileShare>\|as FileShare" src/db/repository.rs`
Expected: 모두 `SELECT *` 또는 `SELECT fs.*` 사용(마이그레이션 후 device_id 포함). 명시 컬럼 목록이 있으면 그 목록에 `device_id` 추가.

### Task A3: create_file_share에 device_id 파라미터 추가

**Files:**
- Modify: `src/db/repository.rs:186-242`

- [ ] **Step 1: 시그니처에 파라미터 추가**

`display_order: i32,` 다음에 추가:

```rust
    display_order: i32,
    device_id: Option<String>,
) -> Result<FileShare, sqlx::Error> {
```

- [ ] **Step 2: INSERT 컬럼/플레이스홀더/바인드 추가**

컬럼 목록 끝 `display_order)` → `display_order, device_id)`, VALUES 끝에 `?` 하나 추가, 바인드 체인 `.bind(display_order)` 다음에 `.bind(&device_id)` 추가:

```rust
        INSERT INTO file_shares
        (id, share_group_id, user_id, created_via_api_key_id, share_code, file_name, file_size, file_type, transfer_type, storage_key,
         description, password_hash, is_one_time, is_quick_access, expires_at, created_at, updated_at,
         image_width, image_height, display_order, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```
```rust
    .bind(display_order)
    .bind(&device_id)
    .execute(pool)
```

### Task A4: 업로드 핸들러 3곳에 device_id 저장

**Files:**
- Modify: `src/handlers/upload.rs` (`upload_file`, create_file_share 호출 ~215)
- Modify: `src/handlers/presigned.rs` (`complete_presigned_upload` ~182/210, `complete_multipart_upload` ~507/550)

각 핸들러는 동일 패턴. **Axum 규칙: `HeaderMap`은 body 추출자(`Multipart`/`Json`) 앞에 위치.**

- [ ] **Step 1: upload_file 시그니처에 HeaderMap 추가**

```rust
pub async fn upload_file(
    State(state): State<UploadState>,
    user_claims: Option<Extension<Claims>>,
    headers: axum::http::HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<MultipleFileUploadResponse>, AppError> {
    let device_id = headers
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
```

- [ ] **Step 2: upload_file의 create_file_share 호출에 device_id 전달**

`create_file_share(...)` 호출의 마지막 인자(`display_order` 다음)로 `device_id.clone()` 추가. (루프 내에서 여러 번 호출되면 매 호출에 `device_id.clone()`.)

```rust
        display_order_value,
        device_id.clone(),
    )
```

- [ ] **Step 3: complete_presigned_upload 동일 처리**

시그니처에 `headers: axum::http::HeaderMap,`를 `Json(request)` 앞에 추가, 같은 device_id 추출 블록 추가, `create_file_share` 호출 끝에 `device_id.clone()` 추가.

- [ ] **Step 4: complete_multipart_upload 동일 처리**

시그니처에 `headers: axum::http::HeaderMap,`를 `Json(request)` 앞에 추가, device_id 추출, `create_file_share` 호출 끝에 `device_id.clone()` 추가.

- [ ] **Step 5: 다른 create_file_share 호출처 점검**

Run: `grep -rn "create_file_share(" src/`
Expected: 위 3곳 + (QuickAccess 등) 추가 호출처가 있으면 그 호출에도 마지막 인자로 `None`(device 무관) 또는 적절한 값을 전달해 컴파일을 맞춘다. P2P/QuickAccess는 device 추적 대상 아니므로 `None`.

### Task A5: repository에 delete_file_shares_by_code 추가

**Files:**
- Modify: `src/db/repository.rs` (delete_all_user_file_shares 근처, ~457 이후)

- [ ] **Step 1: 함수 추가**

```rust
pub async fn delete_file_shares_by_code(
    pool: &MySqlPool,
    code: &str,
) -> Result<Vec<String>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (String,)>(
        "SELECT storage_key FROM file_shares WHERE share_code = ?",
    )
    .bind(code)
    .fetch_all(pool)
    .await?;

    let storage_keys: Vec<String> =
        rows.into_iter().map(|r| r.0).filter(|k| !k.is_empty()).collect();

    sqlx::query("DELETE FROM file_shares WHERE share_code = ?")
        .bind(code)
        .execute(pool)
        .await?;

    release_share_code(pool, code).await?;

    Ok(storage_keys)
}
```

### Task A6: delete_share 핸들러 추가

**Files:**
- Modify: `src/handlers/download.rs` (파일 끝에 추가; `DownloadState`, `repository`, error helpers, `Claims`, `StatusCode`, `Path`, `Request` 이미 import 가능 — 확인 후 누락 import 추가)

- [ ] **Step 1: import 확인/추가**

`download.rs` 상단 import에 `extract::{Query, Request, State}` 의 `Path`가 없으면 추가: `extract::{Path, Query, Request, State}`. `StatusCode`는 이미 `http::{... StatusCode}`로 있음.

- [ ] **Step 2: 핸들러 추가**

```rust
/// Revoke a share by code. Authorized if the caller owns it (matching user_id)
/// or uploaded it from this device (matching device_id). Hard-deletes all rows
/// for the code so downloads stop immediately.
pub async fn delete_share(
    State(state): State<DownloadState>,
    Path(code): Path<String>,
    request: Request,
) -> Result<StatusCode, AppError> {
    let user_id = request.extensions().get::<Claims>().map(|c| c.sub.clone());
    let device_id = request
        .headers()
        .get("x-device-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let shares = repository::find_file_shares_by_code(&state.db, &code)
        .await
        .map_err(|_| internal_error("Failed to fetch share"))?;

    if shares.is_empty() {
        return Err(not_found("Share not found"));
    }

    let owner = &shares[0];
    let authorized = (user_id.is_some() && owner.user_id == user_id)
        || (device_id.is_some() && owner.device_id == device_id);
    if !authorized {
        return Err(forbidden("Not allowed to revoke this share"));
    }

    let storage_keys = repository::delete_file_shares_by_code(&state.db, &code)
        .await
        .map_err(|e| internal_error(format!("Failed to delete share: {}", e)))?;

    if !storage_keys.is_empty() {
        let _ = state.storage.delete_files(storage_keys).await;
    }

    Ok(StatusCode::NO_CONTENT)
}
```

### Task A7: 라우트 등록

**Files:**
- Modify: `src/routes.rs:171-179`

- [ ] **Step 1: download_routes에 라우트 추가**

`.route("/file/verify-password", post(handlers::download::verify_password))` 다음 줄에 추가:

```rust
        .route("/file/verify-password", post(handlers::download::verify_password))
        .route("/shares/:code", delete(handlers::download::delete_share))
```

- [ ] **Step 2: `delete` import 확인**

`routes.rs` 상단 `use axum::{routing::{get, post, delete, ...}}` 에 `delete`가 있는지 확인(quick_access/user 라우트에서 이미 사용 중이므로 존재). 없으면 추가.

### Task A8: 백엔드 빌드

- [ ] **Step 1: 컴파일**

Run (백엔드 디렉터리): `cargo build`
Expected: 에러 없이 빌드 성공. (create_file_share 호출처 인자 수 불일치가 나면 Task A4 Step5 누락 호출처 수정.)

- [ ] **Step 2: 커밋(사용자 요청 시에만)**

사용자가 "커밋해" 라고 할 때만. 메시지 예: `feat: add device-scoped share revoke endpoint`

---

## Phase B — 프론트 기반(저장소·API·i18n·토스트)

### Task B1: recentSessions.removeSession

**Files:**
- Modify: `src/utils/recentSessions.ts`
- Test: `src/utils/__tests__/recentSessions.test.ts` (기존 파일)

- [ ] **Step 1: 실패 테스트 작성**

기존 테스트 파일에 추가:

```ts
import { pushSession, listSessions, removeSession, clearSessions } from '../recentSessions';

test('removeSession removes only the matching code', () => {
  clearSessions();
  const base = { fileNames: ['a'], totalSize: 1, expiresAt: new Date(Date.now() + 3600_000).toISOString(), createdAt: new Date().toISOString() };
  pushSession({ ...base, code: '111111' });
  pushSession({ ...base, code: '222222' });
  removeSession('111111');
  const codes = listSessions().map((s) => s.code);
  expect(codes).toEqual(['222222']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/recentSessions.test.ts`
Expected: FAIL (`removeSession` is not a function).

- [ ] **Step 3: 구현**

`clearSessions` 위에 추가:

```ts
export const removeSession = (code: string): void => {
  writeAll(readAll().filter((s) => s.code !== code));
};
```

- [ ] **Step 4: 통과 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/recentSessions.test.ts`
Expected: PASS.

### Task B2: fileAPI.revokeShare

**Files:**
- Modify: `src/services/api.ts` (`fileAPI` 객체 끝, ~549)

- [ ] **Step 1: 메서드 추가**

`fileAPI` 객체의 마지막 메서드 뒤에 추가:

```ts
  revokeShare: async (code: string): Promise<void> => {
    await api.delete(`/shares/${code}`);
  },
```

### Task B3: i18n 키 추가 (5개 로케일)

**Files:**
- Modify: `src/i18n/{ko,en,ja,zh-CN,zh-TW}.json` (`common` 스코프)

- [ ] **Step 1: 각 로케일 common에 키 추가**

`common`의 `"copy"` 다음 줄에 추가:

- ko: `"undo": "실행 취소",` / `"deleted": "삭제되었습니다",`
- en: `"undo": "Undo",` / `"deleted": "Deleted",`
- ja: `"undo": "元に戻す",` / `"deleted": "削除しました",`
- zh-CN: `"undo": "撤销",` / `"deleted": "已删除",`
- zh-TW: `"undo": "復原",` / `"deleted": "已刪除",`

- [ ] **Step 2: JSON 유효성 확인**

Run: `for l in ko en ja zh-CN zh-TW; do node -e "require('./src/i18n/$l.json').common.undo||process.exit(1)"; done && echo OK`
Expected: `OK`.

### Task B4: ToastContext 확장(액션/커밋/duration)

**Files:**
- Modify: `src/context/ToastContext.tsx`

- [ ] **Step 1: Toast 인터페이스/옵션 확장**

`Toast` 인터페이스에 옵션 필드 추가:

```ts
export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  onAutoClose?: () => void;
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  forceDismiss?: boolean;
}
```

- [ ] **Step 2: addToast가 옵션을 받도록 변경**

```ts
interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
}
```
```ts
  const addToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `toast-${++toastIdRef.current}`;
    const newToast: Toast = { id, type, message, ...options };

    setToasts((prev) => {
      const visible = prev.filter((t) => !t.forceDismiss);
      if (visible.length >= MAX_TOASTS) {
        const oldestId = visible[0].id;
        return [
          ...prev.map((t) => (t.id === oldestId ? { ...t, forceDismiss: true } : t)),
          newToast,
        ];
      }
      return [...prev, newToast];
    });
  }, []);
```

- [ ] **Step 3: 전역 헬퍼에 action 추가**

```ts
let toastFunctions: {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  action: (message: string, options: ToastOptions & { type?: ToastType }) => void;
} | null = null;

export const setToastFunctions = (
  addToast: (type: ToastType, message: string, options?: ToastOptions) => void
) => {
  toastFunctions = {
    success: (message) => addToast('success', message),
    error: (message) => addToast('error', message),
    warning: (message) => addToast('warning', message),
    info: (message) => addToast('info', message),
    action: (message, { type = 'success', ...options }) => addToast(type, message, options),
  };
};

export const toast = {
  success: (message: string) => toastFunctions?.success(message),
  error: (message: string) => toastFunctions?.error(message),
  warning: (message: string) => toastFunctions?.warning(message),
  info: (message: string) => toastFunctions?.info(message),
  action: (message: string, options: ToastOptions & { type?: ToastType }) =>
    toastFunctions?.action(message, options),
};
```

### Task B5: Toast.tsx 액션 버튼 + 커밋-온-소멸 + duration

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: ToastItem에 undone/committed ref + finalizeRemove + duration**

`mountTimeRef` 선언 다음에 추가:

```tsx
  const undoneRef = useRef(false);
  const committedRef = useRef(false);
  const DURATION = toast.duration ?? 2700;

  const finalizeRemove = useCallback(() => {
    if (!undoneRef.current && !committedRef.current && toast.onAutoClose) {
      committedRef.current = true;
      toast.onAutoClose();
    }
    onRemove(toast.id);
  }, [onRemove, toast.id, toast.onAutoClose]);
```

- [ ] **Step 2: collapseAndRemove가 finalizeRemove를 호출하도록 변경**

`collapseAndRemove` 내 `onRemove(toast.id)` 2곳을 `finalizeRemove()` 로 교체하고, deps를 `[finalizeRemove]`로:

```tsx
  const collapseAndRemove = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) { finalizeRemove(); return; }
    el.style.height = el.offsetHeight + 'px';
    el.style.overflow = 'hidden';
    void el.offsetHeight;
    el.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1), padding-bottom 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    el.style.height = '0';
    el.style.paddingBottom = '0';
    setTimeout(() => finalizeRemove(), 300);
  }, [finalizeRemove]);
```

- [ ] **Step 3: 자동 닫힘 타이머에 DURATION 적용**

`exitTimerRef.current = setTimeout(..., 2700);` 의 `2700` → `DURATION`. isFirst 재계산 블록의 `2700 - elapsed` 도 `DURATION - elapsed` 로.

- [ ] **Step 4: 액션 버튼 렌더 + handleAction**

메시지 `<span>` 다음(닫는 div 직전)에 추가, 그리고 handleAction 정의:

```tsx
  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    undoneRef.current = true;
    toast.onAction?.();
    dismiss();
  };
```
```tsx
          <span className="text-foreground text-sm font-medium">
            {toast.message}
          </span>
          {toast.actionLabel && (
            <button
              onClick={handleAction}
              className="ml-1 flex-shrink-0 rounded-full bg-foreground text-background text-xs font-semibold px-3 py-1 can-hover:hover:opacity-90 active:opacity-90"
            >
              {toast.actionLabel}
            </button>
          )}
```

- [ ] **Step 5: 빌드 확인**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

---

## Phase C — 공통 병합 로직 + 훅

### Task C1: shareMerge 유틸 (TDD)

**Files:**
- Create: `src/utils/shareMerge.ts`
- Test: `src/utils/__tests__/shareMerge.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```ts
import { groupUploads, mergeShares, MergedShare } from '../shareMerge';
import { UploadHistoryItem } from '../../types';
import { RecentSession } from '../recentSessions';

const item = (over: Partial<UploadHistoryItem>): UploadHistoryItem => ({
  id: 'i', share_code: '000000', file_name: 'f', file_size: 10, file_type: '',
  has_password: false, expires_at: '2026-01-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
  download_url: '', qr_code: '', download_count: 0, ...over,
});

test('groupUploads groups by share_code with summed size', () => {
  const groups = groupUploads([
    item({ id: 'a', share_code: 'AAA111', file_size: 5 }),
    item({ id: 'b', share_code: 'AAA111', file_size: 7 }),
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].totalSize).toBe(12);
});

test('mergeShares dedups by code (server wins) and sorts newest first', () => {
  const local: RecentSession[] = [
    { code: 'AAA111', fileNames: ['x'], totalSize: 1, expiresAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'LOCAL1', fileNames: ['y'], totalSize: 2, expiresAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-04T00:00:00Z' },
  ];
  const serverGroups = groupUploads([ item({ share_code: 'AAA111', created_at: '2026-01-01T00:00:00Z' }) ]);
  const merged: MergedShare[] = mergeShares(local, serverGroups);
  expect(merged.map((m) => m.code)).toEqual(['LOCAL1', 'AAA111']);
  expect(merged.find((m) => m.code === 'AAA111')!.source).toBe('both');
  expect(merged.find((m) => m.code === 'LOCAL1')!.source).toBe('local');
});
```

- [ ] **Step 2: 실패 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/shareMerge.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: 구현**

```ts
import { UploadGroup, UploadHistoryItem } from '../types';
import { RecentSession } from './recentSessions';

export interface MergedShare {
  code: string;
  fileNames: string[];
  totalSize: number;
  createdAt: string;
  expiresAt: string;
  source: 'local' | 'server' | 'both';
}

export const groupUploads = (items: UploadHistoryItem[]): UploadGroup[] => {
  const map = new Map<string, UploadHistoryItem[]>();
  for (const it of items) {
    const list = map.get(it.share_code);
    if (list) list.push(it);
    else map.set(it.share_code, [it]);
  }
  const groups: UploadGroup[] = [];
  map.forEach((files, shareCode) => {
    const totalSize = files.reduce((s, f) => s + f.file_size, 0);
    const downloadCount = files.reduce((s, f) => s + f.download_count, 0);
    const hasPassword = files.some((f) => f.has_password);
    const isOneTime = !!files[0]?.is_one_time;
    const expiresAt = files.reduce(
      (min, f) => (new Date(f.expires_at) < new Date(min) ? f.expires_at : min),
      files[0].expires_at
    );
    const createdAt = files.reduce(
      (min, f) => (new Date(f.created_at) < new Date(min) ? f.created_at : min),
      files[0].created_at
    );
    groups.push({ shareCode, files, totalSize, downloadCount, hasPassword, isOneTime, expiresAt, createdAt });
  });
  groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return groups;
};

export const mergeShares = (
  local: RecentSession[],
  serverGroups: UploadGroup[]
): MergedShare[] => {
  const byCode = new Map<string, MergedShare>();
  for (const g of serverGroups) {
    byCode.set(g.shareCode, {
      code: g.shareCode,
      fileNames: g.files.map((f) => f.file_name),
      totalSize: g.totalSize,
      createdAt: g.createdAt,
      expiresAt: g.expiresAt,
      source: 'server',
    });
  }
  for (const s of local) {
    const existing = byCode.get(s.code);
    if (existing) {
      existing.source = 'both';
    } else {
      byCode.set(s.code, {
        code: s.code,
        fileNames: s.fileNames,
        totalSize: s.totalSize,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        source: 'local',
      });
    }
  }
  return Array.from(byCode.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
```

- [ ] **Step 4: 통과 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/shareMerge.test.ts`
Expected: PASS.

### Task C2: useShareList 훅

**Files:**
- Create: `src/hooks/useShareList.ts`

- [ ] **Step 1: 구현**

```ts
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { toast } from '../context/ToastContext';
import { userAPI, fileAPI } from '../services/api';
import { listSessions, removeSession, RecentSession } from '../utils/recentSessions';
import { groupUploads, mergeShares, MergedShare } from '../utils/shareMerge';
import { UploadGroup } from '../types';

const UNDO_MS = 5000;

export const useShareList = (refreshKey?: number) => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [local, setLocal] = useState<RecentSession[]>([]);
  const [serverGroups, setServerGroups] = useState<UploadGroup[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLocal(listSessions());
    if (!isAuthenticated) {
      setServerGroups([]);
      return;
    }
    try {
      setLoading(true);
      const res = await userAPI.getUploads(20, 0);
      setServerGroups(groupUploads(res.items));
    } catch {
      setServerGroups([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const items: MergedShare[] = mergeShares(local, serverGroups).filter(
    (i) => !pending.has(i.code)
  );

  const requestDelete = useCallback((code: string) => {
    setPending((prev) => new Set(prev).add(code));

    const restore = () =>
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });

    const commit = async () => {
      try {
        await fileAPI.revokeShare(code);
      } catch (e: any) {
        const status = e?.response?.status;
        if (status && status !== 404) {
          toast.error(t('history.deleteFailed'));
          restore();
          return;
        }
      }
      removeSession(code);
      setLocal((prev) => prev.filter((s) => s.code !== code));
      setServerGroups((prev) => prev.filter((g) => g.shareCode !== code));
      restore();
    };

    toast.action(t('common.deleted'), {
      actionLabel: t('common.undo'),
      duration: UNDO_MS,
      onAction: restore,
      onAutoClose: commit,
    });
  }, [t]);

  return { items, loading, refresh: load, requestDelete };
};
```

- [ ] **Step 2: 빌드 확인**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

---

## Phase D — 홈 박스(RecentShares)

### Task D1: RecentShares를 useShareList + 휴지통으로 교체

**Files:**
- Modify: `src/components/UnifiedFileBox/RecentShares.tsx`

- [ ] **Step 1: 데이터 소스를 훅으로 교체**

`listSessions`/`RecentSession`/`useState`(items)/`useEffect` 대신 훅 사용:

```tsx
import { useShareList } from '../../hooks/useShareList';
```
컴포넌트 본문에서:
```tsx
  const { items, requestDelete } = useShareList(refreshKey);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) return null;
```
기존 `const [items, setItems] = useState<RecentSession[]>([])` 와 `useEffect(setItems(listSessions()))` 제거. 이후 `items.map((s) => ...)` 에서 `s.fileNames`, `s.code`, `s.totalSize`, `s.createdAt`, `s.expiresAt` 는 `MergedShare`에 동일하게 존재하므로 그대로 동작.

- [ ] **Step 2: 휴지통 버튼 추가**

`TrashIcon` import 추가: `import { ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';`
복사 버튼(`CopyButton`) 다음, 챕트론 앞에 추가:

```tsx
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDelete(s.code); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 active:text-red-600 dark:active:text-red-400"
                    title={t('common.delete')}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
```

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

---

## Phase E — /history 병합 + revoke 삭제

### Task E1: 로컬 전용 공유를 그룹으로 변환하는 헬퍼

**Files:**
- Modify: `src/utils/shareMerge.ts`
- Test: `src/utils/__tests__/shareMerge.test.ts`

- [ ] **Step 1: 실패 테스트 추가**

```ts
import { localOnlyGroups } from '../shareMerge';

test('localOnlyGroups skips codes already on server', () => {
  const local: RecentSession[] = [
    { code: 'AAA111', fileNames: ['x'], totalSize: 1, expiresAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'LOCAL1', fileNames: ['y', 'z'], totalSize: 4, expiresAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-04T00:00:00Z' },
  ];
  const groups = localOnlyGroups(local, new Set(['AAA111']));
  expect(groups.map((g) => g.shareCode)).toEqual(['LOCAL1']);
  expect(groups[0].files).toHaveLength(2);
  expect(groups[0].totalSize).toBe(4);
});
```

- [ ] **Step 2: 실패 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/shareMerge.test.ts`
Expected: FAIL (`localOnlyGroups` 없음).

- [ ] **Step 3: 구현 추가 (shareMerge.ts)**

```ts
export const localOnlyGroups = (
  local: RecentSession[],
  serverCodes: Set<string>
): UploadGroup[] =>
  local
    .filter((s) => !serverCodes.has(s.code))
    .map((s) => ({
      shareCode: s.code,
      files: s.fileNames.map((name, i) => ({
        id: `local:${s.code}:${i}`,
        share_code: s.code,
        file_name: name,
        file_size: i === 0 ? s.totalSize : 0,
        file_type: '',
        has_password: false,
        is_one_time: false,
        expires_at: s.expiresAt,
        created_at: s.createdAt,
        download_url: '',
        qr_code: '',
        download_count: 0,
      })),
      totalSize: s.totalSize,
      downloadCount: 0,
      hasPassword: false,
      isOneTime: false,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
```

- [ ] **Step 4: 통과 확인**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/shareMerge.test.ts`
Expected: PASS.

### Task E2: UploadHistoryPage 병합 + 삭제 교체

**Files:**
- Modify: `src/pages/UploadHistoryPage.tsx`

- [ ] **Step 1: groupedUploads에 로컬 전용 병합**

`groupUploads`/`localOnlyGroups` import 추가:
```tsx
import { groupUploads, localOnlyGroups } from '../utils/shareMerge';
import { listSessions } from '../utils/recentSessions';
```
기존 `groupedUploads` useMemo(라인 ~250-277)를 교체:
```tsx
const groupedUploads = useMemo<UploadGroup[]>(() => {
  const serverGroups = groupUploads(uploads);
  const serverCodes = new Set(serverGroups.map((g) => g.shareCode));
  const merged = [...serverGroups, ...localOnlyGroups(listSessions(), serverCodes)];
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged;
}, [uploads]);
```

- [ ] **Step 2: 삭제 핸들러를 revoke+undo로 교체**

`handleDeleteGroup`(라인 ~326-361)을 교체:
```tsx
const handleDeleteGroup = (shareCode: string, e: React.MouseEvent) => {
  e.stopPropagation();
  // optimistic hide
  setUploads((prev) => prev.filter((u) => u.share_code !== shareCode));
  if (expandedRow === shareCode) setExpandedRow(null);

  const restore = () => fetchUploads();
  const commit = async () => {
    try {
      await fileAPI.revokeShare(shareCode);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status !== 404) { toast.error(t('history.deleteFailed')); restore(); return; }
    }
    removeSession(shareCode);
  };
  toast.action(t('common.deleted'), {
    actionLabel: t('common.undo'),
    duration: 5000,
    onAction: restore,
    onAutoClose: commit,
  });
};
```
import 추가: `import { fileAPI } from '../services/api';`(이미 있으면 생략), `import { removeSession } from '../utils/recentSessions';`. `window.confirm` 제거.

- [ ] **Step 3: 빌드 확인**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

> 참고: 로컬 전용 그룹은 `download_url`/썸네일이 비어 있어 프리뷰/다운로드 로그가 자연히 빈 상태. 행 펼침 시 로그 fetch는 `local:` id로 404→기존 에러 처리로 흡수됨. 정렬은 createdAt desc로 서버·로컬 혼합.

---

## Phase F — 검증

### Task F1: 타입체크 + 단위 테스트

- [ ] **Step 1**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 에러 없음.

- [ ] **Step 2**

Run: `CI=true npx react-app-rewired test src/utils/__tests__/`
Expected: 모든 테스트 PASS.

### Task F2: Playwright 시각/동작 검증 (dev 서버)

- [ ] **Step 1:** dev 서버 기동(`PORT=4000 BROWSER=none npm start`), 컴파일 대기.
- [ ] **Step 2:** 홈에서 localStorage `recentSessions` 시드(단일/묶음 혼합) 후 새로고침.
- [ ] **Step 3:** 한 항목의 휴지통 클릭 → 즉시 목록에서 사라짐 + "삭제되었습니다" 토스트에 라운드 Undo 버튼(라이트=검정/흰, 다크=흰/검정) 표시 확인.
- [ ] **Step 4:** Undo 클릭 → 항목 복원, 토스트 사라짐, 서버 호출 없음.
- [ ] **Step 5:** 다시 삭제 후 Undo 미클릭 → 토스트 자연 소멸 시 `DELETE /shares/{code}` 호출되는지 네트워크로 확인(백엔드 미가동 시 요청 발생만 확인).
- [ ] **Step 6:** 모바일 폭(320/375)에서 휴지통 추가 후 행 레이아웃·토스트 버튼 깨짐 없음 확인.
- [ ] **Step 7:** 임시 시드/스크린샷 정리, dev 서버 종료.

### Task F3: 커밋(사용자 요청 시에만)

- [ ] 사용자가 "커밋해" 라고 할 때만 프론트/백엔드 각각 커밋+푸시. 메시지 예: `feat: merge server and local shares with undo revoke`.

---

## Self-Review 메모

- Spec 커버리지: 통합 목록(C1/C2, D1, E2), device-scoped revoke(A1-A7), undo 토스트(B4/B5, C2), 둘 다 표시(D/E) — 모두 태스크 존재.
- 타입 일관성: `MergedShare`/`UploadGroup`/`RecentSession` 필드와 `useShareList`·UI 접근 일치. `toast.action`/`ToastOptions` 시그니처 B4↔C2 일치. `revokeShare`(B2)↔호출(C2/E2) 일치.
- Out of scope 유지: 변경 이전 익명 공유 처리 코드 없음, P2P 미포함, soft-delete 미도입.
- 리스크: (1) 백엔드 create_file_share 추가 호출처(A4-S5)·FromRow 명시컬럼(A2-S2) 점검 필요. (2) 마이그레이션 적용 방식은 프로젝트 환경에 의존(A1-S2). (3) /history 로컬 그룹의 프리뷰/로그는 빈 상태로 degrade.
