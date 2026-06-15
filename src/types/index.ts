export interface User {
  id: string;
  email: string;
  name: string;
  profile_image: string;
  oauth_provider?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  reactivated?: boolean;
  is_new_user?: boolean;
}

export interface FileShare {
  id: string;
  share_code: string;
  file_name: string;
  file_size: number;
  file_type: string;
  transfer_type: 'server' | 'p2p';
  description?: string;
  has_password: boolean;
  expires_at: string;
  created_at: string;
  download_url: string;
  qr_code: string;
  uploader_online: boolean | null;
}

export interface FileUploadResponse {
  share_code: string;
  total_count: number;
  files: FileShare[];
}

export interface FileInfo {
  share_code: string;
  file_name: string;
  file_size: number;
  file_type: string;
  transfer_type: 'server' | 'p2p';
  description?: string;
  has_password: boolean;
  expires_at: string;
  uploader_name?: string;
  uploader_online: boolean | null;
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

export interface UploadGroup {
  shareCode: string;
  files: UploadHistoryItem[];
  totalSize: number;
  downloadCount: number;
  hasPassword: boolean;
  isOneTime: boolean;
  expiresAt: string;
  createdAt: string;
}

export type ExpirationOption = 'five_minutes' | 'thirty_minutes' | 'one_hour' | 'three_hours' | 'six_hours' | 'twelve_hours' | 'twenty_four_hours';

export interface FileListItem {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  image_width?: number;
  image_height?: number;
  relative_path?: string;
}

export interface FileListResponse {
  share_code: string;
  files: FileListItem[];
  total_count: number;
  description?: string;
  has_password: boolean;
  expires_at: string;
  transfer_type: 'server' | 'p2p';
  uploader_online: boolean | null;
}

export interface BulkDownloadRequest {
  code: string;
  file_ids: string[];
  password?: string;
}

export interface P2PStatusResponse {
  share_code: string;
  uploader_online: boolean;
}

export type SignalingMessageType =
  | 'uploader_ready'
  | 'downloader_join'
  | 'downloader_arrived'
  | 'peer_matched'
  | 'offer'
  | 'answer'
  | 'ice_candidate'
  | 'transfer_complete'
  | 'error'
  | 'uploader_offline'
  | 'downloader_offline'
  | 'downloader_paused'
  | 'uploader_cancelled'
  | 'file_request'
  | 'ping'
  | 'pong';

export interface SignalingMessage {
  type: SignalingMessageType;
  share_code?: string;
  peer_id?: string;
  role?: 'uploader' | 'downloader';
  sdp?: string;
  candidate?: string;
  sdp_mid?: string | null;
  sdp_m_line_index?: number | null;
  message?: string;
  file_name?: string;
  device_info?: string;
  password?: string;
}

export interface PresignedUploadFileInfo {
  file_name: string;
  file_size: number;
  content_type: string;
}

export interface PresignedUploadRequest {
  files: PresignedUploadFileInfo[];
  description?: string;
  password?: string;
  expiration?: ExpirationOption;
  is_one_time?: boolean;
}

export interface PresignedUploadUrl {
  file_name: string;
  storage_key: string;
  presigned_url: string;
}

export interface PresignedUploadResponse {
  upload_session_id: string;
  share_code: string;
  urls: PresignedUploadUrl[];
  expires_in_secs: number;
}

export interface CompleteUploadFile {
  file_name: string;
  storage_key: string;
  file_size: number;
  content_type: string;
  image_width?: number;
  image_height?: number;
}

export interface CompleteUploadRequest {
  upload_session_id: string;
  share_code: string;
  files: CompleteUploadFile[];
}

export interface MultipartUploadFileInfo {
  file_name: string;
  file_size: number;
  content_type: string;
  relative_path?: string;
}

export interface InitMultipartUploadRequest {
  files: MultipartUploadFileInfo[];
  description?: string;
  password?: string;
  expiration?: ExpirationOption;
  is_one_time?: boolean;
  chunk_size: number;
}

export interface MultipartUploadFileInit {
  file_name: string;
  storage_key: string;
  upload_id: string;
  total_parts: number;
  upload_signature: string;
}

export interface InitMultipartUploadResponse {
  upload_session_id: string;
  share_code: string;
  files: MultipartUploadFileInit[];
  chunk_size: number;
}

export interface GetPartUrlsRequest {
  upload_session_id: string;
  storage_key: string;
  upload_id: string;
  part_numbers: number[];
}

export interface PartPresignedUrl {
  part_number: number;
  presigned_url: string;
}

export interface GetPartUrlsResponse {
  storage_key: string;
  urls: PartPresignedUrl[];
  expires_in_secs: number;
}

export interface CompletedPart {
  part_number: number;
  etag: string;
}

export interface CompleteMultipartFileInfo {
  file_name: string;
  storage_key: string;
  upload_id: string;
  file_size: number;
  content_type: string;
  relative_path?: string;
  parts: CompletedPart[];
  image_width?: number;
  image_height?: number;
}

export interface CompleteMultipartUploadRequest {
  upload_session_id: string;
  share_code: string;
  files: CompleteMultipartFileInfo[];
}

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface QuickAccessFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_key: string;
  uploaded_from?: string;
  expires_at: string;
  created_at: string;
}

export interface QuickAccessListResponse {
  files: QuickAccessFile[];
}

export interface TurnCredentialsResponse {
  ice_servers: IceServer[];
}

export interface EmailAuthSendResponse {
  session_id: string;
}

export interface EmailAuthStatusResponse {
  status: 'pending' | 'verified' | 'completed';
  auth?: { token: string; user: User; existing_provider?: string };
}

export interface EmailAuthVerifyResponse {
  same_device: boolean;
  auth?: { token: string; user: User; existing_provider?: string };
  verification_code?: string;
}

export interface EmailAuthVerifyCodeResponse {
  token: string;
  user: User;
  existing_provider?: string;
}

export interface Session {
  jti: string;
  device_label?: string;
  ip_address: string;
  location?: string;
  last_seen_at: string;
  created_at: string;
  is_current: boolean;
  kind?: 'web' | 'cli';
}

export interface TrustedDevice {
  id: string;
  device_id?: string;
  device_label?: string;
  ip_address: string;
  location?: string;
  trusted_at: string;
}

export interface SessionTokenResponse {
  session_token: string;
  expires_at: string;
}

export interface UserSettings {
  notify_upload: boolean;
  notify_download: boolean;
  notify_download_alert: boolean;
  notify_security: boolean;
  notify_language: string;
  default_expiration: ExpirationOption;
}
