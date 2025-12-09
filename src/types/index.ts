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
  share_code: string;
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
  id: string;
  share_code: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
  has_password: boolean;
  is_one_time?: boolean;
  expires_at: string;
  created_at: string;
  download_url: string;
  qr_code: string;
  download_count: number;
}

export interface UploadHistoryResponse {
  items: UploadHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export type ExpirationOption = 'five_minutes' | 'thirty_minutes' | 'one_hour' | 'three_hours' | 'six_hours' | 'twelve_hours' | 'twenty_four_hours';

export interface UploadFormData {
  files: File[];
  description?: string;
  password?: string;
  expiration: ExpirationOption;
}

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

export interface BulkDownloadRequest {
  code: string;
  file_ids: string[];
  password?: string;
}
