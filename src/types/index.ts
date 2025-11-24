export interface User {
  id: string;
  email: string;
  name: string;
  profile_image: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface FileShare {
  id: string;
  share_code: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  has_password: boolean;
  expires_at: string;
  created_at: string;
  download_url: string;
  qr_code: string;
}

export interface FileUploadResponse {
  share_code: string;  // ⭐ 그룹 전체의 공유 코드
  total_count: number;
  files: FileShare[];
}

export interface FileInfo {
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  has_password: boolean;
  expires_at: string;
  uploader_name?: string;
}

export interface DownloadLog {
  id: string;
  downloader_name?: string;
  ip_address: string;
  device_platform: string;
  downloaded_at: string;
}

export interface UploadHistoryItem {
  file_share: FileShare;
  download_count: number;
}

export interface UploadHistoryResponse {
  items: UploadHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export type ExpirationOption = 'one_time' | 'five_minutes' | 'thirty_minutes' | 'one_hour' | 'three_hours' | 'six_hours' | 'twelve_hours' | 'twenty_four_hours';

export interface UploadFormData {
  files: File[];
  description?: string;
  password?: string;
  expiration: ExpirationOption;
}

// ⭐ 새로운 API: 파일 목록 조회 응답
export interface FileListItem {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface FileListResponse {
  share_code: string;
  files: FileListItem[];
  total_count: number;
  description?: string;
  has_password: boolean;
  expires_at: string;
}

// ⭐ 새로운 API: Bulk 다운로드 요청
export interface BulkDownloadRequest {
  code: string;
  file_ids: string[];
  password?: string;
}
