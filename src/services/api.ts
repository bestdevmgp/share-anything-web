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
  CompleteMultipartUploadRequest
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL;

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

export const authAPI = {
  getGoogleLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/google`;
    return `${API_BASE_URL}/auth/google?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  getNaverLoginUrl: () => {
    const callbackUrl = `${window.location.origin}/auth/callback/naver`;
    return `${API_BASE_URL}/auth/naver?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  },

  handleOAuthCallback: async (provider: 'google' | 'naver', code: string, state?: string) => {
    const params: any = { code };
    if (state) {
      params.state = state;
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
    return !!localStorage.getItem('auth_token');
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

  // Presigned Upload APIs
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

  // Multipart Upload APIs
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
    // ETag is returned in the response headers
    const etag = response.headers['etag'] || response.headers['ETag'];
    return etag ? etag.replace(/"/g, '') : '';
  },

  completeMultipartUpload: async (request: CompleteMultipartUploadRequest): Promise<FileUploadResponse> => {
    const response = await api.post<FileUploadResponse>('/file/multipart/complete', request);
    return response.data;
  },
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

export default api;
