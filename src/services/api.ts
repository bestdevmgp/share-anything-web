import axios from 'axios';
import { ensureDeviceId } from '../utils/deviceId';
import { getDeviceInfo } from '../utils/format';
import type {
  FileUploadResponse,
  FileInfo,
  UploadHistoryResponse,
  DownloadLog,
  ExpirationOption,
  FileListResponse,
  BulkDownloadRequest,
  P2PStatusResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  CompleteUploadRequest,
  InitMultipartUploadRequest,
  InitMultipartUploadResponse,
  GetPartUrlsRequest,
  GetPartUrlsResponse,
  CompleteMultipartUploadRequest,
  TurnCredentialsResponse,
  QuickAccessListResponse,
  MultipartUploadFileInfo,
  EmailAuthSendResponse,
  EmailAuthStatusResponse,
  EmailAuthVerifyResponse,
  EmailAuthVerifyCodeResponse,
  Session,
  TrustedDevice,
  SessionTokenResponse,
  UserSettings,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const WORKER_URL = 'https://share-anything-upload.pmg3858.workers.dev';

export const workerAPI = {
  createMultipartUpload: async (storageKey: string, contentType: string): Promise<{ uploadId: string; key: string }> => {
    const response = await axios.post(`${WORKER_URL}/multipart/create`, {
      storageKey,
      contentType
    });
    return response.data;
  },

  uploadPart: async (
    storageKey: string,
    uploadId: string,
    partNumber: number,
    chunk: Blob,
    onUploadProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ partNumber: number; etag: string }> => {
    const response = await axios.put(`${WORKER_URL}/multipart/upload-part`, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Storage-Key': storageKey,
        'X-Upload-Id': uploadId,
        'X-Part-Number': partNumber.toString()
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          onUploadProgress(progressEvent.loaded, progressEvent.total);
        }
      }
    });
    return response.data;
  },

  completeMultipartUpload: async (
    storageKey: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[]
  ): Promise<{ success: boolean; etag: string; key: string }> => {
    const response = await axios.post(`${WORKER_URL}/multipart/complete`, {
      storageKey,
      uploadId,
      parts
    });
    return response.data;
  },

  directUpload: async (
    storageKey: string,
    signature: string,
    file: File,
    onUploadProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ success: boolean; etag: string; key: string }> => {
    const response = await axios.put(`${WORKER_URL}/upload`, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Storage-Key': storageKey,
        'X-Upload-Signature': signature
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          onUploadProgress(progressEvent.loaded, progressEvent.total);
        }
      }
    });
    return response.data;
  }
};

let currentSessionToken: string | null = null;
let tokenUnavailable = false;
let tokenWaiters: Array<(t: string | null) => void> = [];

export const setSessionToken = (token: string | null): void => {
  currentSessionToken = token;
  if (token) {
    tokenUnavailable = false;
    const waiters = tokenWaiters;
    tokenWaiters = [];
    waiters.forEach((w) => w(token));
  }
};

export const getSessionToken = (): string | null => currentSessionToken;

export const markTokenUnavailable = (v: boolean): void => {
  tokenUnavailable = v;
};

const STARTUP_TOKEN_WAIT_MS = 12_000;
const REFRESH_WAIT_MS = 8_000;

const waitForNextToken = (timeoutMs: number): Promise<string | null> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (t: string | null) => {
      if (settled) return;
      settled = true;
      resolve(t);
    };
    tokenWaiters.push(finish);
    setTimeout(() => finish(currentSessionToken), timeoutMs);
  });

const waitForToken = (timeoutMs: number): Promise<string | null> =>
  currentSessionToken ? Promise.resolve(currentSessionToken) : waitForNextToken(timeoutMs);

let lastMintRequest = 0;
const requestFreshToken = (): void => {
  const now = Date.now();
  if (now - lastMintRequest < 2000) return;
  lastMintRequest = now;
  window.dispatchEvent(new Event('session-token:force-refresh'));
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const authToken = localStorage.getItem('auth_token');
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  config.headers['X-Device-Id'] = ensureDeviceId();
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  const url = config.url || '';
  const isExchange = url.includes('/auth/session-token');
  // OAuth callback isn't session-gated, so don't block login on the Turnstile mint.
  // The daily-quota widget read isn't session-gated either, so don't make it wait
  // up to 12s for the Turnstile mint — it should render promptly on page load.
  const skipTokenWait =
    isExchange || url.includes('/auth/callback/') || url.includes('/file/quota');

  if (!skipTokenWait && !currentSessionToken && !authToken && !tokenUnavailable) {
    await waitForToken(STARTUP_TOKEN_WAIT_MS);
  }
  if (!isExchange && currentSessionToken) {
    config.headers['X-Session-Token'] = currentSessionToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = (error.response?.data as any)?.code;

    if (
      status === 401 &&
      (code === 'SESSION_TOKEN_EXPIRED' || code === 'SESSION_TOKEN_REQUIRED') &&
      original &&
      !original._retriedAfterSessionRefresh
    ) {
      original._retriedAfterSessionRefresh = true;
      requestFreshToken();
      const fresh = await waitForNextToken(REFRESH_WAIT_MS);
      if (fresh) {
        original.headers['X-Session-Token'] = fresh;
      }
      return api(original);
    }

    if (
      status === 401 &&
      error.config?.headers?.Authorization
    ) {
      const url = error.config?.url || '';
      const isPasswordEndpoint =
        url.includes('/verify-password') ||
        url.includes('/download') ||
        url.includes('/preview');
      if (!isPasswordEndpoint) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  getGoogleLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/google`;
    return `${API_BASE_URL}/auth/google?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  getNaverLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/naver`;
    return `${API_BASE_URL}/auth/naver?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  getKakaoLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/kakao`;
    return `${API_BASE_URL}/auth/kakao?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  getAppleLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/apple`;
    return `${API_BASE_URL}/auth/apple?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  handleOAuthCallback: async (provider: 'google' | 'naver' | 'kakao' | 'apple', code: string, state?: string, appleUser?: string) => {
    const params: any = { code };
    if (state) {
      params.state = state;
    }
    if (appleUser) {
      params.apple_user = appleUser;
    }

    const response = await api.get(`/auth/callback/${provider}`, { params });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  sendEmailAuth: async (email: string, deviceId: string): Promise<EmailAuthSendResponse> => {
    const response = await api.post<EmailAuthSendResponse>('/auth/email/send', { email, device_id: deviceId });
    return response.data;
  },

  verifyEmailToken: async (token: string, deviceId?: string): Promise<EmailAuthVerifyResponse> => {
    const response = await api.post<EmailAuthVerifyResponse>('/auth/email/verify', { token, device_id: deviceId });
    return response.data;
  },

  verifyEmailCode: async (sessionId: string, code: string): Promise<EmailAuthVerifyCodeResponse> => {
    const response = await api.post<EmailAuthVerifyCodeResponse>('/auth/email/verify-code', { session_id: sessionId, code });
    return response.data;
  },

  checkEmailAuthStatus: async (sessionId: string): Promise<EmailAuthStatusResponse> => {
    const response = await api.get<EmailAuthStatusResponse>(`/auth/email/status/${sessionId}`);
    return response.data;
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          return false;
        }
      }
    } catch {
    }
    return true;
  },

  exchangeSessionToken: async (turnstileToken: string): Promise<SessionTokenResponse> => {
    const response = await api.post<SessionTokenResponse>('/auth/session-token', {
      turnstile_token: turnstileToken,
    });
    return response.data;
  },
};

export interface DailyQuotaResponse {
  used_bytes: number;
  limit_bytes: number;
  remaining_bytes: number;
  resets_at: string;
  authenticated: boolean;
}

export const fileAPI = {
  upload: async (
    files: File[],
    description?: string,
    password?: string,
    expiration?: ExpirationOption,
    isOneTime?: boolean,
    transferType?: 'server' | 'p2p',
    onUploadProgress?: (progressEvent: { loaded: number; total: number; percentage: number }) => void,
    signal?: AbortSignal
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('file', file);
    });

    if (description) {
      formData.append('description', description);
    }

    if (password) {
      formData.append('password', password);
    }

    if (expiration) {
      formData.append('expiration', expiration);
    }

    if (isOneTime !== undefined) {
      formData.append('is_one_time', String(isOneTime));
    }

    if (transferType) {
      formData.append('transfer_type', transferType);
    }

    const response = await api.post<FileUploadResponse>('/file/upload', formData, {
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      }
    });

    return response.data;
  },

  createP2PSession: async (
    files: { name: string; size: number; type: string; relative_path?: string }[],
    password?: string
  ): Promise<FileUploadResponse> => {
    const body: Record<string, unknown> = {
      files,
    };
    if (password) body.password = password;
    const response = await api.post<FileUploadResponse>('/file/p2p/create', body);
    return response.data;
  },

  getDailyQuota: async (): Promise<DailyQuotaResponse> => {
    const response = await api.get<DailyQuotaResponse>('/file/quota');
    return response.data;
  },

  getFileInfo: async (code: string): Promise<FileInfo> => {
    const response = await api.get<FileInfo>('/file/info', {
      params: { code },
    });
    return response.data;
  },

  download: async (code: string, password?: string): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['X-File-Password'] = password;
    }

    const response = await api.get('/download', {
      params: { code },
      headers,
      responseType: 'blob',
    });

    return response.data;
  },

  verifyPassword: async (code: string, password: string): Promise<void> => {
    await api.post('/file/verify-password', { code, password });
  },

  getFileList: async (code: string, password?: string): Promise<FileListResponse> => {
    const headers: Record<string, string> = {
      'X-Device-Info': getDeviceInfo().replace(/[^\x20-\x7E]/g, ''),
    };
    if (password) {
      headers['X-File-Password'] = password;
    }

    const response = await api.get<FileListResponse>('/files/list', {
      params: { code },
      headers
    });
    return response.data;
  },

  downloadFile: async (
    code: string,
    fileId: string,
    password?: string,
    onDownloadProgress?: (progressEvent: { loaded: number; total: number; percentage: number }) => void,
    signal?: AbortSignal
  ): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['X-File-Password'] = password;
    }

    const response = await api.get('/download/file', {
      params: { code, file_id: fileId },
      headers,
      responseType: 'blob',
      signal,
      onDownloadProgress: (progressEvent) => {
        if (onDownloadProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onDownloadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      }
    });

    return response.data;
  },

  getDownloadUrl: async (
    code: string,
    fileId: string,
    password?: string,
    inline?: boolean,
    preview?: boolean
  ): Promise<{ download_url: string; expires_in_secs: number }> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['X-File-Password'] = password;
    }

    const params: Record<string, string> = { code, file_id: fileId };
    if (inline) params.inline = 'true';
    if (preview) params.preview = 'true';

    const response = await api.get<{ download_url: string; expires_in_secs: number }>('/download/url', {
      params,
      headers
    });

    return response.data;
  },


  previewFile: async (
    code: string,
    fileId: string,
    password?: string
  ): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['X-File-Password'] = password;
    }

    const response = await api.get('/preview/file', {
      params: { code, file_id: fileId },
      headers,
      responseType: 'blob'
    });

    return response.data;
  },

  downloadBulk: async (
    request: BulkDownloadRequest,
    onDownloadProgress?: (progressEvent: { loaded: number; total: number; percentage: number }) => void,
    signal?: AbortSignal
  ): Promise<Blob> => {
    const response = await api.post('/download/bulk', request, {
      responseType: 'blob',
      signal,
      onDownloadProgress: (progressEvent) => {
        if (onDownloadProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onDownloadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      }
    });

    return response.data;
  },

  getP2PStatus: async (code: string): Promise<P2PStatusResponse> => {
    const response = await api.get<P2PStatusResponse>('/p2p/status', {
      params: { code }
    });
    return response.data;
  },

  requestPresignedUpload: async (request: PresignedUploadRequest): Promise<PresignedUploadResponse> => {
    const response = await api.post<PresignedUploadResponse>('/file/presign', request);
    return response.data;
  },

  uploadToPresignedUrl: async (
    presignedUrl: string,
    file: File,
    onUploadProgress?: (progressEvent: { loaded: number; total: number; percentage: number }) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      }
    });
  },

  completePresignedUpload: async (request: CompleteUploadRequest): Promise<FileUploadResponse> => {
    const response = await api.post<FileUploadResponse>('/file/complete', request);
    return response.data;
  },

  initMultipartUpload: async (request: InitMultipartUploadRequest): Promise<InitMultipartUploadResponse> => {
    const response = await api.post<InitMultipartUploadResponse>('/file/multipart/init', request);
    return response.data;
  },

  getPartPresignedUrls: async (request: GetPartUrlsRequest): Promise<GetPartUrlsResponse> => {
    const response = await api.post<GetPartUrlsResponse>('/file/multipart/presign-parts', request);
    return response.data;
  },

  uploadPart: async (
    presignedUrl: string,
    chunk: Blob,
    onUploadProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<string> => {
    const response = await axios.put(presignedUrl, chunk, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      signal,
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          onUploadProgress(progressEvent.loaded, progressEvent.total);
        }
      }
    });
    const etag = response.headers['etag'] || response.headers['ETag'];
    return etag ? etag.replace(/"/g, '') : '';
  },

  completeMultipartUpload: async (request: CompleteMultipartUploadRequest): Promise<FileUploadResponse> => {
    const response = await api.post<FileUploadResponse>('/file/multipart/complete', request);
    return response.data;
  },

  revokeShare: async (code: string): Promise<void> => {
    await api.delete(`/shares/${code}`);
  },
};

export const turnAPI = {
  getCredentials: async (): Promise<TurnCredentialsResponse> => {
    const response = await api.get<TurnCredentialsResponse>('/turn/credentials');
    return response.data;
  }
};

export const userAPI = {
  getUploads: async (limit = 20, offset = 0): Promise<UploadHistoryResponse> => {
    const response = await api.get<UploadHistoryResponse>('/user/uploads', {
      params: { limit, offset }
    });
    return response.data;
  },

  getDownloadLogs: async (fileId: string): Promise<DownloadLog[]> => {
    const response = await api.get<DownloadLog[]>(`/user/uploads/${fileId}/downloads`);
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/user/uploads/${fileId}`);
  },

  deleteAllFiles: async (): Promise<void> => {
    await api.delete('/user/uploads');
  },

  getNotificationSettings: async (): Promise<UserSettings> => {
    const response = await api.get<UserSettings>('/user/settings');
    return response.data;
  },

  updateNotificationSettings: async (settings: UserSettings): Promise<UserSettings> => {
    const response = await api.put<UserSettings>('/user/settings', settings);
    return response.data;
  },

  updateName: async (name: string): Promise<{ name: string }> => {
    const response = await api.put<{ name: string }>('/user/name', { name });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/user/account');
  },
};

export const quickAccessAPI = {
  initUpload: async (
    files: MultipartUploadFileInfo[],
    chunkSize: number,
    deviceInfo?: string
  ): Promise<InitMultipartUploadResponse> => {
    const response = await api.post<InitMultipartUploadResponse>('/user/quick-access/init', {
      files,
      chunk_size: chunkSize,
      device_info: deviceInfo,
    });
    return response.data;
  },

  list: async (): Promise<QuickAccessListResponse> => {
    const response = await api.get<QuickAccessListResponse>('/user/quick-access');
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/user/quick-access/${fileId}`);
  },

  previewFile: async (fileId: string): Promise<{ preview_url: string; file_name: string; expires_in_secs: number }> => {
    const response = await api.get<{ preview_url: string; file_name: string; expires_in_secs: number }>(
      `/user/quick-access/preview/${fileId}`
    );
    return response.data;
  },

  shareFile: async (fileId: string): Promise<{ share_code: string }> => {
    const response = await api.post<{ share_code: string }>(`/user/quick-access/share/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: string): Promise<{ download_url: string; file_name: string; expires_in_secs: number }> => {
    const response = await api.get<{ download_url: string; file_name: string; expires_in_secs: number }>(
      `/user/quick-access/download/${fileId}`
    );
    return response.data;
  },
};

export const cliAuthAPI = {
  completeSession: (sessionId: string) =>
    api.post(`/cli/auth/session/${sessionId}/complete`).then(res => res.data),
  getStatus: (sessionId: string) =>
    api.get<{ status: string }>(`/cli/auth/session/${sessionId}/status`).then(res => res.data),
};

export const sessionAPI = {
  list: async (): Promise<Session[]> => {
    const response = await api.get<Session[]>('/user/sessions');
    return response.data;
  },

  terminate: async (jti: string): Promise<void> => {
    await api.delete(`/user/sessions/${jti}`);
  },

  terminateOthers: async (): Promise<void> => {
    await api.delete('/user/sessions');
  },

  listTrusted: async (): Promise<TrustedDevice[]> => {
    const response = await api.get<TrustedDevice[]>('/user/trusted-devices');
    return response.data;
  },

  deleteTrusted: async (id: string): Promise<void> => {
    await api.delete(`/user/trusted-devices/${id}`);
  },
};

export const personalTokenAPI = {
  generate: async (name?: string, expiresInDays?: number): Promise<{ id: string; personal_token: string; token_prefix: string; name: string; expires_at: string | null; created_at: string }> => {
    const response = await api.post('/user/personal-tokens', { name, expires_in_days: expiresInDays });
    return response.data;
  },

  list: async (): Promise<{ id: string; token_prefix: string; name: string; last_used_at: string | null; expires_at: string | null; created_at: string }[]> => {
    const response = await api.get('/user/personal-tokens');
    return response.data;
  },

  revoke: async (tokenId: string): Promise<void> => {
    await api.delete(`/user/personal-tokens/${tokenId}`);
  },
};

export interface ApiKeyApplicationRequest {
  service_name: string;
  service_url: string;
  purpose: string;
  scopes: string[];
  tz_offset_minutes: number;
  requested_expires_at: string | null;
}

export interface ApiKeyApplicationResponse {
  id: number;
  service_name: string;
  service_url: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reject_reason: string | null;
  api_key_id: string | null;
  reveal_token: string | null;
  created_at: string;
  reviewed_at: string | null;
  scopes: string[];
  requested_expires_at: string | null;
}

export interface ApiKeyItem {
  id: string;
  key_prefix: string;
  name: string;
  scopes: ('read' | 'upload' | 'delete')[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  reveal_token: string | null;
}

export interface ApiKeyRevealResponse {
  api_key: string;
  key_prefix: string;
  name: string;
  scopes: ('read' | 'upload' | 'delete')[];
  expires_at: string | null;
  created_at: string;
}

export const apiKeyAPI = {
  apply: async (req: ApiKeyApplicationRequest): Promise<ApiKeyApplicationResponse> => {
    const response = await api.post('/user/api-keys/applications', req);
    return response.data;
  },

  listApplications: async (): Promise<ApiKeyApplicationResponse[]> => {
    const response = await api.get('/user/api-keys/applications');
    return response.data;
  },

  getApplication: async (id: number): Promise<ApiKeyApplicationResponse> => {
    const response = await api.get(`/user/api-keys/applications/${id}`);
    return response.data;
  },

  cancel: async (id: number): Promise<void> => {
    await api.delete(`/user/api-keys/applications/${id}`);
  },

  listKeys: async (): Promise<ApiKeyItem[]> => {
    const response = await api.get('/user/api-keys');
    return response.data;
  },

  revoke: async (id: string): Promise<void> => {
    await api.delete(`/user/api-keys/${id}`);
  },

  reveal: async (token: string): Promise<ApiKeyRevealResponse> => {
    const response = await api.get(`/user/api-keys/reveal/${token}`);
    return response.data;
  },
};
