import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, fileAPI } from '../services/api';
import { UploadHistoryItem, DownloadLog } from '../types';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { isVideoFile, isAudioFile, isTextFile } from '../utils/format';

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
  const [copiedFiles, setCopiedFiles] = useState<{ [key: string]: boolean }>({});
  const [videoPreviews, setVideoPreviews] = useState<{ [key: string]: string }>({});
  const [audioPreviews, setAudioPreviews] = useState<{ [key: string]: string }>({});
  const [textPreviews, setTextPreviews] = useState<{ [key: string]: string }>({});
  const [loadingFilePreviews, setLoadingFilePreviews] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUploads();
  }, [offset, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (showAllLogsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAllLogsModal]);

  useEffect(() => {
    document.title = '업로드 기록';
    return () => {
      document.title = 'ShareAnything';
    };
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUploads(limit, offset);
      setUploads(response.items);
      setTotal(response.total);
    } catch (error: any) {
      console.error('Failed to fetch uploads:', error);
      toast.error('업로드 기록을 불러오는데 실패했습니다.');
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
      toast.error('다운로드 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingLogs({ ...loadingLogs, [fileId]: false });
    }
  };

  const loadFilePreview = async (upload: UploadHistoryItem) => {
    const fileName = upload.file_name;

    if (isVideoFile(fileName) && !videoPreviews[upload.id]) {
      try {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: true }));
        const blob = await fileAPI.previewFile(upload.share_code, upload.id);
        const url = URL.createObjectURL(blob);
        setVideoPreviews(prev => ({ ...prev, [upload.id]: url }));
      } catch (err) {
        console.error('Failed to load video preview:', err);
      } finally {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: false }));
      }
    } else if (isAudioFile(fileName) && !audioPreviews[upload.id]) {
      try {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: true }));
        const blob = await fileAPI.previewFile(upload.share_code, upload.id);
        const url = URL.createObjectURL(blob);
        setAudioPreviews(prev => ({ ...prev, [upload.id]: url }));
      } catch (err) {
        console.error('Failed to load audio preview:', err);
      } finally {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: false }));
      }
    } else if (isTextFile(fileName) && !textPreviews[upload.id]) {
      try {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: true }));
        const blob = await fileAPI.previewFile(upload.share_code, upload.id);
        const text = await blob.text();
        setTextPreviews(prev => ({ ...prev, [upload.id]: text }));
      } catch (err) {
        console.error('Failed to load text preview:', err);
      } finally {
        setLoadingFilePreviews(prev => ({ ...prev, [upload.id]: false }));
      }
    }
  };

  const handleRowClick = (fileId: string) => {
    if (expandedRow === fileId) {
      setClosingRow(fileId);
      setTimeout(() => {
        setExpandedRow(null);
        setClosingRow(null);
      }, 300);
    } else {
      setExpandedRow(fileId);
      fetchDownloadLogs(fileId);
      const upload = uploads.find(u => u.id === fileId);
      if (upload) {
        loadFilePreview(upload);
      }
    }
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까?')) {
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
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleCopyLink = (fileId: string, shareCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/download/${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedFiles({ ...copiedFiles, [fileId]: true });
    setTimeout(() => {
      setCopiedFiles({ ...copiedFiles, [fileId]: false });
    }, 2000);
  };

  const handleViewAllLogs = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFileForLogs(fileId);
    setShowAllLogsModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
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

  const truncateFileName = (fileName: string, maxLength: number = 30) => {
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

  const getFileIcon = (fileType: string) => {
    const colorClass = fileType.startsWith('image/') ? 'text-blue-500' :
      fileType.startsWith('video/') ? 'text-purple-500' :
      fileType.includes('pdf') ? 'text-red-500' : 'text-gray-500';

    if (fileType.startsWith('image/')) {
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      );
    } else if (fileType.startsWith('video/')) {
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        </svg>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    } else {
      return (
        <svg className={`w-8 h-8 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-32">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">업로드 기록</h1>
        <p className="text-gray-600 mt-2">활성 파일이 총 {total}개 있습니다.</p>
      </div>

      {uploads.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">활성화된 공유 파일이 없습니다.</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            파일 공유하기
          </button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg border-[3px] border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                      동작
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
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                              {isImageFileByType(upload.file_type) ? (
                                loadingPreviews[upload.id] ? (
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                ) : (
                                  <img
                                    src={getPreviewUrl(upload.share_code, upload.id)}
                                    alt={upload.file_name}
                                    className="w-full h-full object-cover"
                                    onLoadStart={() => setLoadingPreviews({ ...loadingPreviews, [upload.id]: true })}
                                    onLoad={() => setLoadingPreviews({ ...loadingPreviews, [upload.id]: false })}
                                    onError={(e) => {
                                      setLoadingPreviews({ ...loadingPreviews, [upload.id]: false });
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '';
                                        const icon = getFileIcon(upload.file_type);
                                        parent.appendChild(document.createRange().createContextualFragment(icon.props.children));
                                      }
                                    }}
                                  />
                                )
                              ) : (
                                getFileIcon(upload.file_type)
                              )}
                            </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(upload.file_size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(upload.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(upload.expires_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {upload.download_count}회
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isExpired(upload.expires_at) ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              만료됨
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              활성
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={(e) => handleCopyLink(upload.id, upload.share_code, e)}
                              className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                              title="링크 복사"
                            >
                              {copiedFiles[upload.id] ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                                </svg>
                              )}
                            </button>
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
                              <div className="space-y-6">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 mb-4">미리보기</h3>
                                  <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                    {loadingFilePreviews[upload.id] ? (
                                      <div className="flex flex-col items-center justify-center h-64 bg-gray-100">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                        <p className="text-sm text-gray-500">로딩 중...</p>
                                      </div>
                                    ) : isImageFileByType(upload.file_type) ? (
                                      loadingPreviews[`expanded_${upload.id}`] ? (
                                        <div className="flex items-center justify-center h-96 bg-gray-100">
                                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        </div>
                                      ) : (
                                        <img
                                          src={getPreviewUrl(upload.share_code, upload.id)}
                                          alt={upload.file_name}
                                          className="w-full h-auto max-h-96 object-contain"
                                          onLoadStart={() => setLoadingPreviews({ ...loadingPreviews, [`expanded_${upload.id}`]: true })}
                                          onLoad={() => setLoadingPreviews({ ...loadingPreviews, [`expanded_${upload.id}`]: false })}
                                        />
                                      )
                                    ) : isVideoFile(upload.file_name) && videoPreviews[upload.id] ? (
                                      <video
                                        src={videoPreviews[upload.id]}
                                        controls
                                        className="w-full max-h-96"
                                      >
                                        브라우저가 비디오 재생을 지원하지 않습니다.
                                      </video>
                                    ) : isAudioFile(upload.file_name) && audioPreviews[upload.id] ? (
                                      <div className="p-8">
                                        <audio
                                          src={audioPreviews[upload.id]}
                                          controls
                                          className="w-full"
                                        >
                                          브라우저가 오디오 재생을 지원하지 않습니다.
                                        </audio>
                                      </div>
                                    ) : isTextFile(upload.file_name) && textPreviews[upload.id] ? (
                                      <div className="max-h-96 overflow-auto bg-gray-50 p-6">
                                        <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono">
                                          {textPreviews[upload.id]}
                                        </pre>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center h-64 bg-gray-100">
                                        {getFileIcon(upload.file_type)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 정보</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                                      <div>
                                        <span className="text-sm font-medium text-gray-500">파일명</span>
                                        <p className="text-sm text-gray-900 break-all">{upload.file_name}</p>
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
                                      <div className="col-span-2">
                                        <span className="text-sm font-medium text-gray-500">설명</span>
                                        <p className="text-sm text-gray-900">{upload.description || '없음'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-full flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
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
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 flex flex-col">
                                      {loadingLogs[upload.id] ? (
                                        <div className="text-sm text-gray-500 text-center py-4 flex-1 flex items-center justify-center">로딩 중...</div>
                                      ) : downloadLogs[upload.id]?.length > 0 ? (
                                        <div className="space-y-4 overflow-y-auto pr-2 flex-1" style={{
                                          maxHeight: downloadLogs[upload.id].length <= 3 ? 'none' : '240px'
                                        }}>
                                          {downloadLogs[upload.id].map((log) => (
                                            <div
                                              key={log.id}
                                              className="text-sm border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                                            >
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <p className="font-medium text-gray-900">
                                                    {log.downloader_name || '익명의 사용자'}
                                                  </p>
                                                  <p className="text-gray-500 text-xs mt-2">
                                                    {log.device_platform} • {log.ip_address}
                                                  </p>
                                                </div>
                                                <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
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

                                {!isExpired(upload.expires_at) && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">QR 코드</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 inline-block">
                                      <img
                                        src={upload.qr_code}
                                        alt="QR Code"
                                        className="w-32 h-32"
                                      />
                                    </div>
                                  </div>
                                )}
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
              <div key={upload.id} className="bg-white rounded-lg border-[3px] border-gray-100 overflow-hidden">
                <div className="relative">
                  <div className="absolute top-3 right-3 flex space-x-2 z-10">
                    <button
                      onClick={(e) => handleCopyLink(upload.id, upload.share_code, e)}
                      className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                      title="링크 복사"
                    >
                      {copiedFiles[upload.id] ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(upload.id, e)}
                      className="p-2 text-gray-700 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div
                    onClick={() => handleRowClick(upload.id)}
                    className={`p-4 cursor-pointer ${expandedRow === upload.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3 pr-20">
                    <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                      {isImageFileByType(upload.file_type) ? (
                        loadingPreviews[`mobile_${upload.id}`] ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        ) : (
                          <img
                            src={getPreviewUrl(upload.share_code, upload.id)}
                            alt={upload.file_name}
                            className="w-full h-full object-cover"
                            onLoadStart={() => setLoadingPreviews({ ...loadingPreviews, [`mobile_${upload.id}`]: true })}
                            onLoad={() => setLoadingPreviews({ ...loadingPreviews, [`mobile_${upload.id}`]: false })}
                          />
                        )
                      ) : (
                        getFileIcon(upload.file_type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900" title={upload.file_name}>
                        {truncateFileName(upload.file_name, 15)}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatFileSize(upload.file_size)}</span>
                        <span>•</span>
                        <span>{upload.download_count}회</span>
                        <span>•</span>
                        {isExpired(upload.expires_at) ? (
                          <span className="text-red-600 font-medium">만료됨</span>
                        ) : (
                          <span className="text-green-600 font-medium">활성</span>
                        )}
                      </div>
                      {upload.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
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
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {loadingFilePreviews[upload.id] ? (
                            <div className="flex flex-col items-center justify-center h-24 bg-gray-100">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                              <p className="text-xs text-gray-500">로딩 중...</p>
                            </div>
                          ) : isImageFileByType(upload.file_type) ? (
                            <img
                              src={getPreviewUrl(upload.share_code, upload.id)}
                              alt={upload.file_name}
                              className="w-full h-auto max-h-32 object-contain"
                            />
                          ) : isVideoFile(upload.file_name) && videoPreviews[upload.id] ? (
                            <video
                              src={videoPreviews[upload.id]}
                              controls
                              className="w-full max-h-48"
                            >
                              브라우저가 비디오 재생을 지원하지 않습니다.
                            </video>
                          ) : isAudioFile(upload.file_name) && audioPreviews[upload.id] ? (
                            <div className="p-4">
                              <audio
                                src={audioPreviews[upload.id]}
                                controls
                                className="w-full"
                              >
                                브라우저가 오디오 재생을 지원하지 않습니다.
                              </audio>
                            </div>
                          ) : isTextFile(upload.file_name) && textPreviews[upload.id] ? (
                            <div className="max-h-48 overflow-auto bg-gray-50 p-3">
                              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                                {textPreviews[upload.id]}
                              </pre>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-24 bg-gray-100">
                              {getFileIcon(upload.file_type)}
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
                            <span className="text-gray-500">설명:</span>
                            <span className="ml-2 text-gray-900">{upload.description || '없음'}</span>
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

                      {!isExpired(upload.expires_at) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">QR 코드</h4>
                          <div className="bg-white rounded-lg border border-gray-200 p-3 inline-block">
                            <img src={upload.qr_code} alt="QR Code" className="w-24 h-24" />
                          </div>
                        </div>
                      )}

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
                            <div className="text-xs text-gray-500 text-center py-3">로딩 중...</div>
                          ) : downloadLogs[upload.id]?.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto pr-1" style={{
                              maxHeight: downloadLogs[upload.id].length <= 2 ? 'none' : '180px'
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
                            <div className="text-xs text-gray-500 text-center py-3">
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
            <div className="overflow-auto flex-1 rounded-b-xl">
              {downloadLogs[selectedFileForLogs]?.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        다운로더
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        플랫폼
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP 주소
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        다운로드 시간
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {downloadLogs[selectedFileForLogs].map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.downloader_name || '익명의 사용자'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.device_platform}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          </div>
        </div>
      )}

      <style>{`
        @keyframes expandDown {
          from {
            opacity: 0;
            max-height: 0;
            overflow: hidden;
          }
          to {
            opacity: 1;
            max-height: 2000px;
          }
        }

        @keyframes collapseUp {
          from {
            opacity: 1;
            max-height: 2000px;
          }
          to {
            opacity: 0;
            max-height: 0;
            overflow: hidden;
          }
        }

        .animate-expand-down {
          animation: expandDown 0.4s ease-in-out forwards;
        }

        .animate-collapse-up {
          animation: collapseUp 0.4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UploadHistoryPage;
