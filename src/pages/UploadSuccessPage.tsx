import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUploadResponse } from '../types';
import { copyToClipboard, formatDateTime, formatFileSize } from '../utils/format';
import { CheckIcon, ClipboardDocumentIcon, DocumentIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useP2PUploader } from '../hooks/useP2PUploader';

const UploadSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '업로드 완료';
  }, []);

  const uploadResult = location.state?.uploadResult as FileUploadResponse | undefined;
  const uploadedFiles = location.state?.uploadedFiles as File[] | undefined;
  const uploadedFile = location.state?.uploadedFile as File | undefined;

  const files = uploadedFiles || (uploadedFile ? [uploadedFile] : []);

  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const isP2PTransfer = uploadResult?.files?.[0]?.transfer_type === 'p2p';
  const groupShareCode = uploadResult?.share_code || uploadResult?.files?.[0]?.share_code || '';

  const [showFailedModal, setShowFailedModal] = useState(false);

  const { status: p2pStatus, fileProgresses, peerDeviceInfo, connectionFailed, retry, cancelTransfer } = useP2PUploader({
    shareCode: groupShareCode,
    files: files,
    enabled: isP2PTransfer && files.length > 0 && !!uploadResult
  });

  useEffect(() => {
    if (connectionFailed) {
      setShowFailedModal(true);
    }
  }, [connectionFailed]);

  const handleSwitchToServerUpload = () => {
    navigate('/upload', {
      state: {
        fallbackFiles: files,
        fromP2PFallback: true
      }
    });
  };

  const handleRetryP2P = () => {
    setShowFailedModal(false);
    retry();
  };

  useEffect(() => {
    if (!uploadResult) {
      navigate('/upload', { replace: true });
    }
  }, [uploadResult, navigate]);

  if (!uploadResult) {
    return null;
  }

  const downloadUrl = `${window.location.origin}/download/${groupShareCode}`;

  const displayCode = groupShareCode.length === 6
    ? `${groupShareCode.slice(0, 3)} ${groupShareCode.slice(3)}`
    : groupShareCode;

  const handleCopy = async (text: string, field: 'code' | 'link') => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const allFilesCompleted = isP2PTransfer && files.every(file => {
    const progress = fileProgresses.get(file.name);
    return progress?.status === 'completed';
  });

  const anyFileTransferring = isP2PTransfer && files.some(file => {
    const progress = fileProgresses.get(file.name);
    return progress?.status === 'transferring';
  });

  const getOverallStatus = () => {
    if (allFilesCompleted) return 'completed';
    if (anyFileTransferring) return 'transferring';
    if (p2pStatus === 'connected') return 'connected';
    return 'waiting';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              !isP2PTransfer || allFilesCompleted ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isP2PTransfer && !allFilesCompleted ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="upload-checkmark-path" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? '수신자 대기 중...' :
              overallStatus === 'connected' ? '수신자 연결됨' :
              overallStatus === 'transferring' ? '파일 전송 중...' :
              '전송 완료'
            ) : '업로드 완료'}
          </h1>
          <p className="text-lg text-gray-600">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? '수신자가 연결될 때까지 이 페이지를 닫지 마세요.' :
              allFilesCompleted ? '모든 파일이 성공적으로 전송되었습니다.' :
              peerDeviceInfo ? `${peerDeviceInfo}에 연결되었습니다. 파일을 전송 중입니다.` :
              '파일을 전송 중입니다. 잠시만 기다려주세요.'
            ) : '코드를 공유하거나 아래 링크를 통해 파일을 다운로드하세요.'}
          </p>
        </div>
        <style>{`
          .upload-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawUploadCheck 0.6s ease-out forwards;
          }
          @keyframes drawUploadCheck {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 md:p-12">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 mb-3 text-center">
              전송 코드
            </label>
            <div className="relative bg-gray-50 rounded-xl px-4 md:px-8 py-4 md:py-6 mb-4 border border-gray-300">
              <p className="text-4xl md:text-5xl font-bold text-center text-gray-900 break-all" style={{ letterSpacing: '0.1em' }}>
                {displayCode}
              </p>
              <button
                onClick={() => handleCopy(groupShareCode, 'code')}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="코드 복사"
              >
                {copiedField === 'code' ? (
                  <CheckIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
                )}
              </button>
            </div>
            {!isP2PTransfer && uploadResult.files[0]?.expires_at && (
              <p className="text-sm text-gray-500 text-center">
                만료: {formatDateTime(uploadResult.files[0].expires_at)}
              </p>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              공유 링크
            </label>
            <div className="relative">
              <input
                type="text"
                value={downloadUrl}
                readOnly
                className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700"
              />
              <button
                onClick={() => handleCopy(downloadUrl, 'link')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                title="링크 복사"
              >
                {copiedField === 'link' ? (
                  <CheckIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {isP2PTransfer && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                파일 목록 ({files.length}개)
              </label>
              <div className="space-y-3">
                {files.map((file) => {
                  const progress = fileProgresses.get(file.name);
                  const isTransferring = progress?.status === 'transferring';
                  const isCompleted = progress?.status === 'completed';

                  return (
                    <div
                      key={file.name}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isTransferring ? 'bg-blue-50 border-blue-200' :
                        isCompleted ? 'bg-green-50 border-green-200' :
                        'bg-gray-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isCompleted ? 'bg-green-100' :
                            isTransferring ? 'bg-blue-100' :
                            'bg-gray-100'
                          }`}>
                            {isCompleted ? (
                              <CheckIcon className="w-5 h-5 text-green-600" />
                            ) : (
                              <DocumentIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </h4>
                          {isTransferring ? (
                            <div className="mt-1.5">
                              <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                                  style={{ width: `${progress?.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          {isCompleted ? (
                            <span className="text-sm text-green-600 font-medium">완료</span>
                          ) : isTransferring ? (
                            <div className="flex items-center gap-2">
                              {progress?.timeRemaining && (
                                <span className="text-xs text-gray-500">{progress.timeRemaining}</span>
                              )}
                              <span className="text-xs font-semibold text-blue-600">{progress?.progress || 0}%</span>
                              <button
                                onClick={() => cancelTransfer(file.name)}
                                className="p-1 hover:bg-blue-100 rounded transition-colors"
                                title="전송 중단"
                              >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">대기 중</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              QR 코드로 다운로드
            </label>
            <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl">
              <QRCodeSVG
                value={downloadUrl}
                size={140}
                level="M"
              />
            </div>
          </div>
        </div>

        <div className="mt-10">
          <button
            onClick={() => {
              if (isP2PTransfer) {
                navigate('/', { replace: true });
              } else {
                window.location.href = '/';
              }
            }}
            className="w-full px-8 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            완료
          </button>
        </div>
      </div>

      {/* P2P Connection Failed Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-[30rem] w-full p-6 md:p-8 animate-modal-pop relative">
            <button
              onClick={() => setShowFailedModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
              P2P 연결 실패
            </h3>
            <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">
              교육기관이나 기업 등 사설망에 연결 시 P2P 전송이 차단될 수 있습니다.
              <br />
              일반 전송으로 전환하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetryP2P}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={handleSwitchToServerUpload}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                전환
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-modal-pop {
          animation: modalPop 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UploadSuccessPage;
