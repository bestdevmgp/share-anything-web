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
  transfer_type: 'server' | 'p2p';
  uploader_online: boolean | null;
}

export interface BulkDownloadRequest {
  code: string;
  file_ids: string[];
  password?: string;
}

export type TransferType = 'server' | 'p2p';

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
  | 'downloader_offline';

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
  turnstile_token: string;
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
}

export interface InitMultipartUploadRequest {
  files: MultipartUploadFileInfo[];
  description?: string;
  password?: string;
  expiration?: ExpirationOption;
  is_one_time?: boolean;
  turnstile_token: string;
  chunk_size: number;
}

export interface MultipartUploadFileInit {
  file_name: string;
  storage_key: string;
  upload_id: string;
  total_parts: number;
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
  parts: CompletedPart[];
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

export interface TurnCredentialsResponse {
  ice_servers: IceServer[];
}
