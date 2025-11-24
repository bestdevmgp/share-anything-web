import axios from 'axios';
import type {
  FileUploadResponse,
  FileInfo,
  UploadHistoryResponse,
  DownloadLog,
  ExpirationOption,
  FileListResponse,
  BulkDownloadRequest
} from '../types';
import {env} from "@headlessui/react/dist/utils/env";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://share-api.mingyu.dev';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token and handle content type
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Set Content-Type to application/json by default, unless it's FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  // If it's FormData, let axios set the Content-Type automatically with boundary

  return config;
});

// Auth API
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

// File API
export const fileAPI = {
  upload: async (
    files: File[],
    description?: string,
    password?: string,
    expiration?: ExpirationOption,
    isOneTime?: boolean,
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

  getFileInfo: async (code: string): Promise<FileInfo> => {
    const response = await api.get<FileInfo>('/file/info', {
      params: { code }
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

  // ⭐ 새로운 API: 파일 목록 조회
  getFileList: async (code: string, password?: string): Promise<FileListResponse> => {
    const headers: Record<string, string> = {};
    if (password) {
      headers['X-File-Password'] = password;
    }

    const response = await api.get<FileListResponse>('/files/list', {
      params: { code },
      headers
    });
    return response.data;
  },

  // ⭐ 새로운 API: 단일 파일 다운로드
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

  // ⭐ 새로운 API: 파일 미리보기 (다운로드 카운트 증가 없음)
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
};

// User API
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
