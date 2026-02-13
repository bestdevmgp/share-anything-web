import axios from 'axios';
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
    file: File,
    onUploadProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
  ): Promise<{ success: boolean; etag: string; key: string }> => {
    const response = await axios.put(`${WORKER_URL}/upload`, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Storage-Key': storageKey
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

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
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
  }
};

export const fileAPI = {
  upload: async (
    files: File[],
    description?: string,
    password?: string,
    expiration?: ExpirationOption,
    isOneTime?: boolean,
    turnstileToken?: string,
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

    if (turnstileToken) {
      formData.append('turnstile_token', turnstileToken);
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
    files: { name: string; size: number; type: string }[],
    turnstileToken: string,
    password?: string
  ): Promise<FileUploadResponse> => {
    const body: Record<string, unknown> = {
      files,
      turnstile_token: turnstileToken
    };
    if (password) body.password = password;
    const response = await api.post<FileUploadResponse>('/file/p2p/create', body);
    return response.data;
  },

  getFileInfo: async (code: string, turnstileToken?: string): Promise<FileInfo> => {
    const headers: Record<string, string> = {};
    if (turnstileToken) {
      headers['X-Turnstile-Token'] = turnstileToken;
    }

    const response = await api.get<FileInfo>('/file/info', {
      params: { code },
      headers
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

  getFileList: async (code: string, turnstileToken?: string, password?: string): Promise<FileListResponse> => {
    const headers: Record<string, string> = {};
    if (turnstileToken) {
      headers['X-Turnstile-Token'] = turnstileToken;
    }
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

  downloadFile: async (fileId: string): Promise<{ download_url: string; file_name: string; expires_in_secs: number }> => {
    const response = await api.get<{ download_url: string; file_name: string; expires_in_secs: number }>(
      `/user/quick-access/download/${fileId}`
    );
    return response.data;
  },
};

export default api;
