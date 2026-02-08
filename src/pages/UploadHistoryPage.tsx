import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { UploadHistoryItem, DownloadLog } from '../types';
import { toast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import FileThumbnail from '../components/FileThumbnail';
import { isPdfFile } from '../utils/format';
import { useThumbnail } from '../hooks/useThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';

const PdfPreview: React.FC<{ source: string; fileName: string; width?: number }> = ({ source, fileName, width = 600 }) => {
  const { url, loading } = useThumbnail(source, fileName, width);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (url) {
    return <img src={url} alt={fileName} className="w-full h-full object-contain" />;
  }
  return (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <FileThumbnail source={null} fileName={fileName} size="md" />
    </div>
  );
};

const UploadHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [uploads, setUploads] = useState<UploadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [downloadLogs, setDownloadLogs] = useState<{ [key: string]: DownloadLog[] }>({});
  const [loadingLogs, setLoadingLogs] = useState<{ [key: string]: boolean }>({});
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  const [selectedFileForLogs, setSelectedFileForLogs] = useState<string | null>(null);
  const [loadingPreviews, setLoadingPreviews] = useState<{ [key: string]: boolean }>({});
  const [closingRow, setClosingRow] = useState<string | null>(null);
  const [previewModalFile, setPreviewModalFile] = useState<{ fileName: string; fileSize: number; source: string } | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedShareCode, setSelectedShareCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const logsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAllLogsModal && selectedFileForLogs) {
      const timer = setTimeout(() => {
        const container = logsScrollRef.current;
        if (container && container.scrollWidth > container.clientWidth) {
          setShowScrollHint(true);

          const dismiss = () => setShowScrollHint(false);
          container.addEventListener('scroll', dismiss, { once: true, passive: true });
          container.addEventListener('touchstart', dismiss, { once: true, passive: true });
          return () => {
            container.removeEventListener('scroll', dismiss);
            container.removeEventListener('touchstart', dismiss);
          };
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setShowScrollHint(false);
    }
  }, [showAllLogsModal, selectedFileForLogs]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (showAllLogsModal || showQRModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAllLogsModal, showQRModal]);

  useEffect(() => {
    document.title = '업로드 기록';
    return () => {
      document.title = 'ShareAnything';
    };
  }, []);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showQRModal) {
        setShowQRModal(false);
      }
    };

    if (showQRModal) {
      window.addEventListener('keydown', handleEscKey);
    }

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showQRModal]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUploads(limit, offset);
      setUploads(response.items);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to fetch uploads:', error);
      toast.error('업로드 기록 조회에 실패하였습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadLogs = async (fileId: string) => {
    if (downloadLogs[fileId]) {
      return;
    }

    try {
      setLoadingLogs({ ...loadingLogs, [fileId]: true });
      const logs = await userAPI.getDownloadLogs(fileId);
      setDownloadLogs({ ...downloadLogs, [fileId]: logs });
    } catch (error: any) {
      console.error('Failed to fetch download logs:', error);
      toast.error('다운로드 기록 조회에 실패하였습니다.');
    } finally {
      setLoadingLogs({ ...loadingLogs, [fileId]: false });
    }
  };

  const handleRowClick = (fileId: string) => {
    if (expandedRow === fileId) {
      setExpandedRow(null);
      setClosingRow(fileId);
      setTimeout(() => {
        setClosingRow(null);
      }, 300);
    } else {
      setExpandedRow(fileId);
      fetchDownloadLogs(fileId);
    }
  };

  const openPreviewModal = (upload: UploadHistoryItem) => {
    if (isExpired(upload.expires_at)) return;
    const previewUrl = getPreviewUrl(upload.share_code, upload.id);
    setPreviewModalFile({
      fileName: upload.file_name,
      fileSize: upload.file_size,
      source: previewUrl,
    });
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까? 삭제된 파일은 더 이상 다운로드할 수 없습니다.')) {
      return;
    }

    try {
      await userAPI.deleteFile(fileId);
      toast.success('삭제되었습니다.');
      setUploads(uploads.filter(upload => upload.id !== fileId));
      setTotal(total - 1);
      if (expandedRow === fileId) {
        setExpandedRow(null);
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error('삭제에 실패하였습니다.');
    }
  };

  const handleViewAllLogs = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileForLogs(fileId);
    setShowAllLogsModal(true);
  };

  const handleShowQRCode = (shareCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShareCode(shareCode);
    setShowQRModal(true);
    setCopiedLink(false);
  };

  const handleCopyLink = async () => {
    if (!selectedShareCode) return;

    const url = `${window.location.origin}/download/${selectedShareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const isImageFileByType = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const getPreviewUrl = (shareCode: string, fileId: string) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    return `${apiUrl}/preview/file?code=${shareCode}&file_id=${fileId}`;
  };

  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName;

    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return fileName.substring(0, maxLength) + '...';
    }

    const extension = fileName.substring(lastDotIndex);
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const maxNameLength = maxLength - extension.length - 3;

    if (nameWithoutExt.length <= maxNameLength) return fileName;

    return nameWithoutExt.substring(0, maxNameLength) + '...' + extension;
  };

  const getThumbnailSource = (upload: UploadHistoryItem): string | null => {
    if (isExpired(upload.expires_at)) return null;
    if (isImageFileByType(upload.file_type) || isPdfFile(upload.file_name)) {
      return getPreviewUrl(upload.share_code, upload.id);
    }
    return null;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePreviousPage = () => {
    if (offset > 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-16 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">업로드 기록</h1>
        <p className="text-gray-600 mt-2">유효한 파일이 총 {uploads.filter(u => !isExpired(u.expires_at)).length}개 있습니다.</p>
      </div>

      {uploads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">유효한 공유 파일이 없습니다.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            파일 공유하기
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border-[3px] border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      파일명
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      크기
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      업로드 일시
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      만료 기한
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      다운로드
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      상태
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploads.map((upload) => (
                    <React.Fragment key={upload.id}>
                      <tr
                        onClick={() => handleRowClick(upload.id)}
                        className={`cursor-pointer transition-colors bg-white hover:bg-gray-50 ${expandedRow === upload.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 max-w-0">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900" title={upload.file_name}>
                                {truncateFileName(upload.file_name)}
                              </div>
                              {upload.description && (
                                <div className="text-sm text-gray-500 truncate">
                                  {upload.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {formatFileSize(upload.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {formatDate(upload.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {formatDate(upload.expires_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {upload.download_count}회
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isExpired(upload.expires_at) ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              만료됨
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              유효함
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-end gap-0.5">
                            {!isExpired(upload.expires_at) && (
                              <button
                                onClick={(e) => handleShowQRCode(upload.share_code, e)}
                                className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                                title="QR 코드"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(upload.id, e)}
                              className="p-2 text-gray-700 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
                              title="삭제"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {(expandedRow === upload.id || closingRow === upload.id) && (
                        <tr>
                          <td colSpan={7} className="px-6" style={{ backgroundColor: '#F9FAFB' }}>
                            <div className={`py-6 ${closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down'}`}>
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex-shrink-0">미리보기</h3>
                                  <div
                                    className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full flex-1 max-w-md cursor-pointer hover:border-blue-300 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); openPreviewModal(upload); }}
                                  >
                                    {isExpired(upload.expires_at) ? (
                                      <div className="flex items-center justify-center h-full bg-gray-50">
                                        <p className="text-sm text-gray-500 text-center px-4">만료된 파일입니다.</p>
                                      </div>
                                    ) : isImageFileByType(upload.file_type) ? (
                                      loadingPreviews[`expanded_${upload.id}`] ? (
                                        <div className="flex items-center justify-center h-full bg-gray-100">
                                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        </div>
                                      ) : (
                                        <img
                                          src={getPreviewUrl(upload.share_code, upload.id)}
                                          alt={upload.file_name}
                                          className="w-full h-full object-contain"
                                          onLoadStart={() => setLoadingPreviews({ ...loadingPreviews, [`expanded_${upload.id}`]: true })}
                                          onLoad={() => setLoadingPreviews({ ...loadingPreviews, [`expanded_${upload.id}`]: false })}
                                        />
                                      )
                                    ) : isPdfFile(upload.file_name) ? (
                                      <PdfPreview source={getPreviewUrl(upload.share_code, upload.id)} fileName={upload.file_name} />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4 gap-4">
                                        <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                                        <p className="text-sm text-gray-500 text-center">클릭하여 미리보기</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 정보</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-gray-500">파일명</span>
                                        <p className="text-sm text-gray-900 break-all">{upload.file_name}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-gray-500">설명</span>
                                        <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">{upload.description || '없음'}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">파일 타입</span>
                                        <p className="text-sm text-gray-900">{upload.file_type}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">파일 크기</span>
                                        <p className="text-sm text-gray-900">{formatFileSize(upload.file_size)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">공유 코드</span>
                                        <p className="text-sm text-gray-900 font-mono">{upload.share_code}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">비밀번호</span>
                                        <p className="text-sm text-gray-900">{upload.has_password ? '있음' : '없음'}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">일회용 공유</span>
                                        <p className="text-sm text-gray-900">{upload.is_one_time ? '예' : '아니요'}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">다운로드 횟수</span>
                                        <p className="text-sm text-gray-900">{upload.download_count}회</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">업로드 날짜</span>
                                        <p className="text-sm text-gray-900">{formatDate(upload.created_at)}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">만료 날짜</span>
                                        <p className="text-sm text-gray-900">{formatDate(upload.expires_at)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-0 min-h-full flex flex-col overflow-hidden">
                                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                      <h3 className="text-lg font-semibold text-gray-900">다운로드 기록</h3>
                                      {downloadLogs[upload.id]?.length > 3 && (
                                        <button
                                          onClick={(e) => handleViewAllLogs(upload.id, e)}
                                          className="px-3 py-1.5 text-sm text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
                                        >
                                          전체보기
                                        </button>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                      {loadingLogs[upload.id] ? (
                                        <div className="text-sm text-gray-500 text-center py-4 flex-1 flex items-center justify-center">로딩 중...</div>
                                      ) : downloadLogs[upload.id]?.length > 0 ? (
                                        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                                          {downloadLogs[upload.id].map((log) => (
                                            <div
                                              key={log.id}
                                              className="text-sm border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                                            >
                                              <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0 flex-1">
                                                  <p className="font-medium text-gray-900">
                                                    {log.downloader_name || '익명의 사용자'}
                                                  </p>
                                                  <p className="text-gray-500 text-xs mt-2">
                                                    {log.device_platform}
                                                  </p>
                                                  <p className="text-gray-500 text-xs">
                                                    {log.ip_address}
                                                  </p>
                                                </div>
                                                <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                                  {formatDate(log.downloaded_at)}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-500 text-center py-4 flex-1 flex items-center justify-center">
                                          아직 다운로드 기록이 없습니다.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-2">
            {uploads.map((upload) => (
              <div key={upload.id} className="bg-white rounded-xl border-[3px] border-gray-100 overflow-hidden">
                <div className="relative">
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 z-10">
                    {!isExpired(upload.expires_at) && (
                      <button
                        onClick={(e) => handleShowQRCode(upload.share_code, e)}
                        className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                        title="QR 코드"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(upload.id, e)}
                      className="p-2 text-gray-700 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
                      title="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div
                    onClick={() => handleRowClick(upload.id)}
                    className={`p-4 cursor-pointer ${expandedRow === upload.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center space-x-3 pr-20">
                    <FileThumbnail source={getThumbnailSource(upload)} fileName={upload.file_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900" title={upload.file_name}>
                        {truncateFileName(upload.file_name, 25)}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatFileSize(upload.file_size)}</span>
                        <span>•</span>
                        <span>{upload.download_count}회</span>
                        <span>•</span>
                        {isExpired(upload.expires_at) ? (
                          <span className="text-red-600 font-medium">만료됨</span>
                        ) : (
                          <span className="text-green-600 font-medium">유효함</span>
                        )}
                      </div>
                      {upload.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2 overflow-hidden text-ellipsis">
                          {upload.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                {(expandedRow === upload.id || closingRow === upload.id) && (
                  <div className={`border-t border-gray-200 p-4 ${closingRow === upload.id ? 'animate-collapse-up' : 'animate-expand-down'}`} style={{ backgroundColor: '#F9FAFB' }}>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">미리보기</h4>
                        <div
                          className={`bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors ${
                            isExpired(upload.expires_at) ? 'h-28' :
                            isImageFileByType(upload.file_type) ? 'aspect-square' : 'h-32'
                          }`}
                          onClick={() => openPreviewModal(upload)}
                        >
                          {isExpired(upload.expires_at) ? (
                            <div className="flex items-center justify-center h-full bg-gray-50">
                              <p className="text-xs text-gray-500 text-center px-4">만료된 파일입니다.</p>
                            </div>
                          ) : isImageFileByType(upload.file_type) ? (
                            <img
                              src={getPreviewUrl(upload.share_code, upload.id)}
                              alt={upload.file_name}
                              className="w-full h-full object-contain"
                            />
                          ) : isPdfFile(upload.file_name) ? (
                            <PdfPreview source={getPreviewUrl(upload.share_code, upload.id)} fileName={upload.file_name} />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4 gap-4">
                              <FileThumbnail source={null} fileName={upload.file_name} size="md" />
                              <p className="text-xs text-gray-500 text-center">클릭하여 미리보기</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">상세 정보</h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 text-xs">
                          <div>
                            <span className="text-gray-500">파일 타입:</span>
                            <span className="ml-2 text-gray-900">{upload.file_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">공유 코드:</span>
                            <span className="ml-2 text-gray-900 font-mono">{upload.share_code}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">비밀번호:</span>
                            <span className="ml-2 text-gray-900">{upload.has_password ? '있음' : '없음'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">일회용 공유:</span>
                            <span className="ml-2 text-gray-900">{upload.is_one_time ? '예' : '아니요'}</span>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">설명:</div>
                            <div className="text-gray-900 break-words whitespace-pre-wrap">{upload.description || '없음'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">업로드:</span>
                            <span className="ml-2 text-gray-900">{formatDate(upload.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">만료:</span>
                            <span className="ml-2 text-gray-900">{formatDate(upload.expires_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900">다운로드 기록</h4>
                          {downloadLogs[upload.id]?.length > 2 && (
                            <button
                              onClick={(e) => handleViewAllLogs(upload.id, e)}
                              className="px-2 py-1 text-xs text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              전체보기
                            </button>
                          )}
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          {loadingLogs[upload.id] ? (
                            <div className="h-20 flex items-center justify-center text-xs text-gray-500 text-center">로딩 중...</div>
                          ) : downloadLogs[upload.id]?.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto pr-1" style={{
                              maxHeight: downloadLogs[upload.id].length <= 2 ? 'none' : '240px'
                            }}>
                              {downloadLogs[upload.id].map((log) => (
                                <div key={log.id} className="text-xs border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                  <p className="font-medium text-gray-900">{log.downloader_name || '익명의 사용자'}</p>
                                  <p className="text-gray-500 mt-2">
                                    {log.device_platform} • {log.ip_address}
                                  </p>
                                  <p className="text-gray-500 mt-2">{formatDate(log.downloaded_at)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-20 flex items-center justify-center text-xs text-gray-500 text-center">
                              아직 다운로드 기록이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white sm:px-6 mt-4 rounded-lg border-[3px] border-gray-100">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={handlePreviousPage}
                  disabled={offset === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={offset + limit >= total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    전체 <span className="font-medium">{total}</span>개 중{' '}
                    <span className="font-medium">{offset + 1}</span>-
                    <span className="font-medium">{Math.min(offset + limit, total)}</span>개 표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={offset === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">이전</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      페이지 {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={offset + limit >= total}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">다음</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAllLogsModal && selectedFileForLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">전체 다운로드 기록</h2>
              <button
                onClick={() => setShowAllLogsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative flex-1 min-h-0 flex flex-col rounded-b-xl">
              <div ref={logsScrollRef} className="overflow-auto flex-1 min-h-0">
              {downloadLogs[selectedFileForLogs]?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        수신자
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        플랫폼
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        IP 주소
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        다운로드 시간
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {downloadLogs[selectedFileForLogs].map((log) => (
                      <tr key={log.id} className="sm:hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                          {log.downloader_name || '익명의 사용자'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {log.device_platform}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {formatDate(log.downloaded_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  아직 다운로드 기록이 없습니다.
                </div>
              )}
              </div>

              {showScrollHint && (
                <div
                  className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-8 rounded-full bg-white/30 relative overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-white absolute top-1 animate-scroll-hint" />
                    </div>
                    <span className="text-white text-sm font-medium">좌우로 스크롤하세요.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showQRModal && selectedShareCode && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">QR 코드</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex justify-center p-2 bg-white">
                <QRCodeSVG
                  value={`${window.location.origin}/download/${selectedShareCode}`}
                  size={256}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-3">
                QR 코드를 스캔하여 파일을 다운로드하세요.
              </p>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공유 링크
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`${window.location.origin}/download/${selectedShareCode}`}
                  readOnly
                  className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700"
                />
                <button
                  onClick={handleCopyLink}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                  title="링크 복사"
                >
                  {copiedLink ? (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewModalFile && (
        <FilePreviewModal
          file={previewModalFile}
          onClose={() => setPreviewModalFile(null)}
        />
      )}

      <style>{`
        @keyframes expandDown {
          from {
            max-height: 0;
            overflow: hidden;
          }
          to {
            max-height: 2000px;
          }
        }

        @keyframes collapseUp {
          from {
            max-height: 2000px;
          }
          to {
            max-height: 0;
            overflow: hidden;
          }
        }

        .animate-expand-down {
          animation: expandDown 0.3s ease-out forwards;
        }

        .animate-collapse-up {
          animation: collapseUp 0.3s ease-in forwards;
        }

        @keyframes scrollHint {
          0%, 100% { left: 2px; }
          50% { left: calc(100% - 26px); }
        }

        .animate-scroll-hint {
          animation: scrollHint 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default UploadHistoryPage;
