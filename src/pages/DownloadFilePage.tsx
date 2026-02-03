import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { formatFileSize, downloadFile, formatDateTime, isImageFile, isVideoFile, isAudioFile, isTextFile } from '../utils/format';
import { DocumentIcon, LockClosedIcon, CheckIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import TurnstileWidget from '../components/TurnstileWidget';
import { useP2PDownloader } from '../hooks/useP2PDownloader';

const DownloadFilePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    document.title = '파일 다운로드';
  }, []);
  const navigate = useNavigate();

  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('잘못된 코드');

  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadAbortController, setDownloadAbortController] = useState<AbortController | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(new Map());
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  const [isP2PDownload, setIsP2PDownload] = useState(false);
  const [p2pEnabled, setP2pEnabled] = useState(false);

  const handleP2PDownloadComplete = useCallback((blob: Blob, fileName: string) => {
    console.log('[DownloadFilePage] P2P download completed:', { fileName, blobSize: blob.size });
    downloadFile(blob, fileName);
    toast.success('파일 다운로드가 완료되었습니다.');
  }, []);

  const singleFile = fileList?.files?.length === 1 ? fileList.files[0] : null;

  const { status: p2pStatus, progress: p2pProgress } = useP2PDownloader({
    shareCode: code || '',
    fileInfo: singleFile ? {
      share_code: code || '',
      file_name: singleFile.file_name,
      file_size: singleFile.file_size,
      file_type: singleFile.file_type,
      transfer_type: fileList?.transfer_type || 'server',
      has_password: fileList?.has_password || false,
      expires_at: fileList?.expires_at || '',
      uploader_online: fileList?.uploader_online ?? null
    } : {
      share_code: '',
      file_name: '',
      file_size: 0,
      file_type: '',
      transfer_type: 'server',
      has_password: false,
      expires_at: '',
      uploader_online: null
    },
    enabled: p2pEnabled && !!singleFile,
    onComplete: (blob) => handleP2PDownloadComplete(blob, singleFile?.file_name || 'file')
  });

  const loadFileList = useCallback(async (token: string) => {
    if (!code) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const list = await fileAPI.getFileList(code, token);
      setFileList(list);

      console.log('[DownloadFilePage] File list loaded:');
      console.log('  - Full list:', list);
      console.log('  - Transfer type (group level):', list.transfer_type);
      console.log('  - Uploader online (group level):', list.uploader_online);

      if (list.transfer_type === 'p2p') {
        console.log('[DownloadFilePage] P2P file detected');
        setIsP2PDownload(true);

        if (list.uploader_online === false) {
          setErrorTitle('업로더 오프라인');
          setError('업로더가 현재 오프라인입니다. 나중에 다시 시도해주세요.');
          return;
        }
      } else {
        console.log('[DownloadFilePage] Regular file (not P2P)');
      }

      if (!list.has_password) {
        setPasswordVerified(true);
        if (list.files.length === 1) {
          setSelectedFiles(new Set([list.files[0].id]));
        }
      }
    } catch (err: any) {
      const statusCode = err.response?.status;

      if (statusCode === 404) {
        setErrorTitle('잘못된 코드');
        setError('찾을 수 없거나 만료된 파일입니다.');
      } else if (statusCode === 429) {
        setErrorTitle('차단된 IP');
        setError('비정상적인 활동으로 인해 사용자의 IP가 일시적으로 차단되었습니다. 나중에 다시 시도해 주세요.');
      } else {
        setErrorTitle('알 수 없는 오류');
        setError(err.response?.data?.message || '잠시 후에 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  }, [code, navigate]);

  const handleTurnstileVerify = useCallback(async (token: string) => {
    setTurnstileToken(token);
    await loadFileList(token);
    setTurnstileVerified(true);
  }, [loadFileList]);

  useEffect(() => {}, []);

  useEffect(() => {
    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let audioUrl: string | null = null;

    const loadFilePreview = async () => {
      if (!fileList || !code || fileList.files.length !== 1) return;

      const file = fileList.files[0];

      try {
        setLoadingPreview(true);
        const blob = await fileAPI.previewFile(code, file.id, password || undefined);

        if (isImageFile(file.file_name)) {
          const url = URL.createObjectURL(blob);
          imageUrl = url;
          setImagePreview(url);
        } else if (isVideoFile(file.file_name)) {
          const url = URL.createObjectURL(blob);
          videoUrl = url;
          setVideoPreview(url);
        } else if (isAudioFile(file.file_name)) {
          const url = URL.createObjectURL(blob);
          audioUrl = url;
          setAudioPreview(url);
        } else if (isTextFile(file.file_name)) {
          const text = await blob.text();
          setTextPreview(text);
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadFilePreview();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [fileList, code, password]);

  useEffect(() => {
    const createdUrls: string[] = [];

    const loadMultipleImagePreviews = async () => {
      if (!fileList || !code || fileList.files.length <= 1) return;

      const imageFiles = fileList.files.filter(file => isImageFile(file.file_name));

      for (const file of imageFiles) {
        try {
          const blob = await fileAPI.previewFile(code, file.id, password || undefined);
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          setImagePreviews(prev => new Map(prev).set(file.id, url));
        } catch (err) {
          console.error(`Failed to load preview for ${file.file_name}:`, err);
        }
      }
    };

    loadMultipleImagePreviews();

    return () => {
      createdUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [fileList, code, password]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !password) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }

    try {
      setLoading(true);

      await fileAPI.verifyPassword(code, password);

      const list = await fileAPI.getFileList(code, turnstileToken);
      setFileList(list);
      setPasswordVerified(true);
      toast.success('비밀번호가 확인되었습니다.');

      if (list.files.length === 1) {
        setSelectedFiles(new Set([list.files[0].id]));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('비밀번호가 올바르지 않습니다.');
        setPassword('');
        setShowPassword(false);
      } else {
        toast.error('비밀번호 확인에 실패하였습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!code || !fileList || selectedFiles.size === 0) return;

    const abortController = new AbortController();
    setDownloadAbortController(abortController);

    try {
      setDownloading(true);
      setDownloadProgress(0);
      const selectedFileIds = Array.from(selectedFiles);

      // Get all download URLs first
      const downloadUrls: { url: string; fileName: string }[] = [];

      for (let i = 0; i < selectedFileIds.length; i++) {
        const fileId = selectedFileIds[i];
        const file = fileList.files.find(f => f.id === fileId);
        if (!file) continue;

        const { download_url } = await fileAPI.getDownloadUrl(
          code,
          fileId,
          password || undefined
        );

        downloadUrls.push({ url: download_url, fileName: file.file_name });
        setDownloadProgress(Math.round(((i + 1) / selectedFileIds.length) * 50)); // 0-50% for URL fetching
      }

      // Trigger all downloads using invisible anchor tags
      for (let i = 0; i < downloadUrls.length; i++) {
        const { url, fileName } = downloadUrls[i];

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadProgress(50 + Math.round(((i + 1) / downloadUrls.length) * 50)); // 50-100% for downloads

        // Longer delay between downloads to avoid browser blocking multiple downloads
        if (i < downloadUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(
        selectedFileIds.length === 1
          ? '다운로드가 시작되었습니다.'
          : `${selectedFileIds.length}개 파일 다운로드가 시작되었습니다.`
      );
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        toast.info('다운로드가 취소되었습니다.');
      } else if (err.response?.status === 401) {
        toast.error('비밀번호가 올바르지 않습니다.');
        setPasswordVerified(false);
      } else {
        toast.error(err.response?.data?.message || '다운로드에 실패했습니다.');
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadAbortController(null);
    }
  };

  const handleCancelDownload = () => {
    if (downloadAbortController) {
      downloadAbortController.abort();
    }
  };


  if (!turnstileVerified) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 mb-8 text-gray-600">
            {loading ? '파일 정보를 불러오는 중...' : '요청을 검사하는 중...'}
          </p>
          <TurnstileWidget
            onVerify={handleTurnstileVerify}
            onError={() => {
              toast.error('보안 확인에 실패했습니다. 페이지를 새로고침해주세요.');
            }}
            onExpire={() => {
              toast.error('보안 확인이 만료되었습니다. 페이지를 새로고침해주세요.');
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">파일 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18L18 6" className="error-x-path-1" />
                <path d="M6 6l12 12" className="error-x-path-2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{errorTitle}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/', { state: { autoFocus: true } })}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
          <style>{`
            .error-x-path-1,
            .error-x-path-2 {
              stroke-dasharray: 17;
              stroke-dashoffset: 17;
            }
            .error-x-path-1 {
              animation: drawX 0.4s ease-out forwards;
            }
            .error-x-path-2 {
              animation: drawX 0.4s ease-out 0.2s forwards;
            }
            @keyframes drawX {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!fileList) {
    return null;
  }

  if (fileList.has_password && !passwordVerified) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LockClosedIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">비밀번호 입력</h1>
              <p className="text-gray-600">
                이 파일은 비밀번호로 보호되어 있습니다.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-6">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="파일 비밀번호를 입력하세요"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                확인
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (fileList.files.length === 1) {
    const file = fileList.files[0];

    return (
      <div className="flex items-center justify-center px-4 py-12">
    <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isP2PDownload && p2pStatus === 'downloading' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {isP2PDownload && p2pStatus === 'downloading' ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke={isP2PDownload && p2pStatus === 'completed' ? '#16a34a' : '#16a34a'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {isP2PDownload ? (
                p2pStatus === 'waiting' || p2pStatus === 'connecting' ? 'P2P 연결 중...' :
                p2pStatus === 'downloading' ? '파일 다운로드 중...' :
                p2pStatus === 'completed' ? '다운로드 완료!' :
                '다운로드 준비 완료'
              ) : '다운로드 준비 완료'}
            </h1>
            <p className="text-gray-600">
              {isP2PDownload ? (
                p2pStatus === 'downloading' ? '파일을 받는 중입니다. 잠시만 기다려주세요.' :
                p2pStatus === 'completed' ? '파일이 성공적으로 다운로드되었습니다!' :
                'P2P 연결을 준비하고 있습니다...'
              ) : '다운로드를 시작하기 전에 아래 파일 정보를 확인하세요.'}
            </p>
          </div>
          <style>{`
            .download-checkmark-path {
              stroke-dasharray: 20;
              stroke-dashoffset: 20;
              animation: drawDownloadCheck 0.6s ease-out forwards;
            }
            @keyframes drawDownloadCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>

          {/* File Card */}
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 md:p-10">
            {/* File Preview */}
            <div className="flex justify-center mb-8">
              {loadingPreview ? (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : imagePreview && isImageFile(file.file_name) ? (
                <div className="max-w-full max-h-96 overflow-hidden rounded-2xl">
                  <img
                    src={imagePreview}
                    alt={file.file_name}
                    className="max-w-full max-h-96 object-contain"
                  />
                </div>
              ) : videoPreview && isVideoFile(file.file_name) ? (
                <div className="max-w-full rounded-2xl overflow-hidden">
                  <video
                    src={videoPreview}
                    controls
                    className="max-w-full max-h-96"
                  >
                    브라우저가 비디오 재생을 지원하지 않습니다.
                  </video>
                </div>
              ) : audioPreview && isAudioFile(file.file_name) ? (
                <div className="w-full max-w-md">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MusicalNoteIcon className="w-12 h-12 text-green-600" />
                  </div>
                  <audio
                    src={audioPreview}
                    controls
                    className="w-full"
                  >
                    브라우저가 오디오 재생을 지원하지 않습니다.
                  </audio>
                </div>
              ) : textPreview && isTextFile(file.file_name) ? (
                <div className="w-full max-w-2xl max-h-96 overflow-auto bg-gray-50 rounded-2xl p-6">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words font-mono">
                    {textPreview}
                  </pre>
                </div>
              ) : (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <DocumentIcon className="w-12 h-12 text-blue-600" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center break-all">
                {file.file_name}
              </h2>
              {fileList.description && (
                <p className="text-gray-600 text-center mb-6 break-words whitespace-pre-wrap">
                  {fileList.description}
                </p>
              )}
            </div>

            {/* File Details */}
            <div className="space-y-3 mb-8">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">파일 크기</span>
                <span className="font-semibold text-gray-900">{formatFileSize(file.file_size)}</span>
              </div>
              {fileList.description && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">업로드한 사람</span>
                  <span className="font-semibold text-gray-900">익명의 사용자</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-gray-600">만료 일시</span>
                <span className="font-semibold text-gray-900">{formatDateTime(fileList.expires_at)}</span>
              </div>
            </div>

            {/* Download Button */}
            <div className="">
              {isP2PDownload ? (
                p2pStatus === 'downloading' || p2pStatus === 'connecting' ? (
                  <div className="bg-blue-50 rounded-xl px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 pl-2">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 self-start">
                            {p2pStatus === 'connecting' ? '연결 중...' : `다운로드 중... ${p2pProgress}%`}
                          </span>
                          {p2pStatus === 'downloading' && (
                            <span className="text-xs font-semibold text-blue-600 self-end">{p2pProgress}%</span>
                          )}
                        </div>
                        {p2pStatus === 'downloading' && (
                          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                              style={{ width: `${p2pProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : p2pStatus === 'completed' ? (
                  <div className="text-center py-4 text-green-600 font-semibold">
                    ✓ 다운로드 완료
                  </div>
                ) : (
                  <button
                    onClick={() => setP2pEnabled(true)}
                    className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-base md:text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>P2P 다운로드 시작</span>
                  </button>
                )
              ) : downloading ? (
                <div className="bg-blue-50 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 pl-2">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 self-start">
                          {downloadProgress === 100 ? '잠시만 기다려주세요...' : '다운로드 중...'}
                        </span>
                        {downloadProgress < 100 && (
                          <span className="text-xs font-semibold text-blue-600 self-end">{downloadProgress}%</span>
                        )}
                      </div>
                      <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCancelDownload}
                      className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                      title="다운로드 취소"
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownload}
                  className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-base md:text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>파일 다운로드</span>
                </button>
              )}
            </div>

            {/* Back Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(fileList.files.map(f => f.id)));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">파일 다운로드</h1>
          <p className="text-gray-600">
            {fileList.total_count}개의 파일이 있습니다. 다운로드할 파일을 선택하세요.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-10">
          {/* Description */}
          {fileList.description && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 break-words whitespace-pre-wrap">{fileList.description}</p>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              파일 목록 ({selectedFiles.size}/{fileList.total_count} 선택됨)
            </h3>
            <div className="flex gap-1">
              <button
                onClick={selectAllFiles}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                전체 선택
              </button>
              <button
                onClick={deselectAllFiles}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                선택 해제
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-3 mb-8">
            {fileList.files.map((file) => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all ${
                  selectedFiles.has(file.id)
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    selectedFiles.has(file.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedFiles.has(file.id) && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                {/* File Icon or Image Preview */}
                <div className="flex-shrink-0">
                  {isImageFile(file.file_name) && imagePreviews.get(file.id) ? (
                    <img
                      src={imagePreviews.get(file.id)}
                      alt={file.file_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : isVideoFile(file.file_name) ? (
                    <div className="w-12 h-12 bg-purple-50 rounded flex items-center justify-center">
                      <FilmIcon className="w-7 h-7 text-purple-600" />
                    </div>
                  ) : isAudioFile(file.file_name) ? (
                    <div className="w-12 h-12 bg-green-50 rounded flex items-center justify-center">
                      <MusicalNoteIcon className="w-7 h-7 text-green-600" />
                    </div>
                  ) : isTextFile(file.file_name) ? (
                    <div className="w-12 h-12 bg-yellow-50 rounded flex items-center justify-center">
                      <DocumentTextIcon className="w-7 h-7 text-yellow-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                      <DocumentIcon className="w-7 h-7 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-gray-900 truncate">
                    {file.file_name}
                  </h4>
                  <p className="text-sm text-gray-500">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Download Button */}
          <div className="">
            {downloading ? (
              <div className="bg-blue-50 rounded-xl px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 pl-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 self-start">
                        {downloadProgress === 100 ? '잠시만 기다려주세요...' : '다운로드 중...'}
                      </span>
                      {downloadProgress < 100 && (
                        <span className="text-xs font-semibold text-blue-600 self-end">{downloadProgress}%</span>
                      )}
                    </div>
                    <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                    title="다운로드 취소"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleDownload}
                  disabled={selectedFiles.size === 0}
                  className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {selectedFiles.size === 0
                    ? '파일을 선택하세요'
                    : selectedFiles.size === 1
                    ? '다운로드'
                    : `${selectedFiles.size}개 파일 다운로드`
                  }
                </button>

                {selectedFiles.size > 1 && (
                  <p className="text-center text-sm text-gray-500">
                    각 파일이 개별적으로 다운로드됩니다.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Back Button */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadFilePage;
