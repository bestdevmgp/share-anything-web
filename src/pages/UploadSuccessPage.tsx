import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUploadResponse } from '../types';
import { copyToClipboard, formatDateTime, formatFileSize } from '../utils/format';
import { CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useP2PUploader } from '../hooks/useP2PUploader';
import FileThumbnail from '../components/FileThumbnail';
import FilePreviewModal from '../components/FilePreviewModal';
import { useTranslation } from '../i18n';

const UploadSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  useEffect(() => {
    document.title = t('uploadSuccess.pageTitle');
  }, [t]);

  const uploadResult = location.state?.uploadResult as FileUploadResponse | undefined;
  const uploadedFiles = location.state?.uploadedFiles as File[] | undefined;
  const uploadedFile = location.state?.uploadedFile as File | undefined;

  const files = useMemo(() => {
    return uploadedFiles || (uploadedFile ? [uploadedFile] : []);
  }, [uploadedFiles, uploadedFile]);

  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

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
              !isP2PTransfer || allFilesCompleted ? 'bg-green-100 dark:bg-green-500/15' : 'bg-blue-100 dark:bg-blue-500/15'
            }`}>
              {isP2PTransfer && !allFilesCompleted ? (
                overallStatus === 'connected' ? (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                ) : (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                )
              ) : (
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="upload-checkmark-path" />
                </svg>
              )}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-[#EDEDED] mb-3">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? t('uploadSuccess.waitingForReceiver') :
              overallStatus === 'connected' ? t('uploadSuccess.receiverConnected') :
              overallStatus === 'transferring' ? t('uploadSuccess.transferring') :
              t('uploadSuccess.transferComplete')
            ) : t('uploadSuccess.uploadComplete')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-[#888888]">
            {isP2PTransfer ? (
              overallStatus === 'waiting' ? t('uploadSuccess.keepPageOpen') :
              overallStatus === 'connected' ? t('uploadSuccess.connectedReadyToDownload', { device: peerDeviceInfo || '' }) :
              allFilesCompleted ? t('uploadSuccess.allFilesTransferred') :
              peerDeviceInfo ? t('uploadSuccess.connectedTo', { device: peerDeviceInfo }) :
              t('uploadSuccess.transferringPleaseWait')
            ) : t('uploadSuccess.shareCodeOrLink')}
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

        <div className="bg-white dark:bg-[#0B0A0B] rounded-3xl border-2 border-gray-200 dark:border-white/10 p-8 md:p-12">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 dark:text-[#888888] mb-3 text-center">
              {t('uploadSuccess.transferCode')}
            </label>
            <div className="relative bg-gray-50 dark:bg-white/5 rounded-xl px-4 md:px-8 py-4 md:py-6 mb-4 border border-gray-300 dark:border-white/15">
              <p className="text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-[#EDEDED] break-all" style={{ letterSpacing: '0.1em' }}>
                {displayCode}
              </p>
              <button
                onClick={() => handleCopy(groupShareCode, 'code')}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title={t('uploadSuccess.copyCode')}
              >
                {copiedField === 'code' ? (
                  <CheckIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-[#888888]" />
                )}
              </button>
            </div>
            {!isP2PTransfer && uploadResult.files[0]?.expires_at && (
              <p className="text-sm text-gray-500 dark:text-[#888888] text-center">
                {t('uploadSuccess.expires', { dateTime: formatDateTime(uploadResult.files[0].expires_at, language) })}
              </p>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#888888] mb-3">
              {t('uploadSuccess.shareLink')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={downloadUrl}
                readOnly
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/15 rounded-lg text-sm text-gray-700 dark:text-[#EDEDED]"
              />
              <button
                onClick={() => handleCopy(downloadUrl, 'link')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-colors"
                title={t('uploadSuccess.copyLink')}
              >
                {copiedField === 'link' ? (
                  <CheckIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-5 h-5 text-gray-600 dark:text-[#888888]" />
                )}
              </button>
            </div>
          </div>

          {isP2PTransfer && (
            <div className="mb-8">
              {files.length === 1 ? (
                (() => {
                  const file = files[0];
                  const progress = fileProgresses.get(file.name);
                  const isTransferring = progress?.status === 'transferring';
                  const isCompleted = progress?.status === 'completed';

                  if (isCompleted) {
                    return (
                      <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-[#888888] mb-3">
                          {t('common.file')}
                        </label>
                        <div className="p-4 rounded-xl border-2 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-500/15">
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">
                                {file.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-[#888888]">{formatFileSize(file.size)}</p>
                            </div>
                            <div className="flex-shrink-0 text-right mr-4">
                              <span className="text-sm text-green-600 font-medium">{t('uploadSuccess.completed')}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }

                  if (isTransferring || p2pStatus === 'connected') {
                    return (
                      <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 pl-2">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-[#888888] self-start">
                                {isTransferring ? t('uploadSuccess.sending') : t('uploadSuccess.connecting')}
                              </span>
                              {isTransferring && (
                                <div className="flex items-center gap-2 self-end">
                                  {progress?.timeRemaining && (
                                    <span className="text-xs text-gray-500 dark:text-[#888888]">{progress.timeRemaining}</span>
                                  )}
                                  <span className="text-xs font-semibold text-blue-600">{progress?.progress || 0}%</span>
                                </div>
                              )}
                            </div>
                            {isTransferring && (
                              <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                                  style={{ width: `${progress?.progress || 0}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => cancelTransfer(file.name)}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                            title={t('uploadSuccess.cancelTransfer')}
                          >
                            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#888888]" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#888888] mb-3">
                        {t('common.file')}
                      </label>
                      <div
                        className="p-4 rounded-xl border-2 bg-gray-50 dark:bg-white/5 border-transparent cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        onClick={() => setPreviewFile(file)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <FileThumbnail source={file} fileName={file.name} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">
                              {file.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-[#888888]">{formatFileSize(file.size)}</p>
                          </div>
                          <div className="flex-shrink-0 text-right mr-4">
                            <span className="text-sm text-gray-400 dark:text-[#666666]">{t('uploadSuccess.waiting')}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#888888] mb-3">
                    {t('uploadSuccess.fileList', { count: files.length })}
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
                            isTransferring ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' :
                            isCompleted ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' :
                            'bg-gray-50 dark:bg-white/5 border-transparent cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10'
                          }`}
                          onClick={() => {
                            if (!isTransferring && !isCompleted) setPreviewFile(file);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-500/15">
                                  <CheckIcon className="w-5 h-5 text-green-600" />
                                </div>
                              ) : (
                                <FileThumbnail source={file} fileName={file.name} size="sm" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-[#EDEDED] truncate">
                                {file.name}
                              </h4>
                              {isTransferring ? (
                                <div className="mt-1.5">
                                  <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                                      style={{ width: `${progress?.progress || 0}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-[#888888]">{formatFileSize(file.size)}</p>
                              )}
                            </div>

                            <div className="flex-shrink-0 text-right">
                              {isCompleted ? (
                                <span className="text-sm text-green-600 font-medium mr-4">{t('uploadSuccess.completed')}</span>
                              ) : isTransferring ? (
                                <div className="flex items-center gap-2 mr-1">
                                  {progress?.timeRemaining && (
                                    <span className="text-xs text-gray-500 dark:text-[#888888]">{progress.timeRemaining}</span>
                                  )}
                                  <span className="text-xs font-semibold text-blue-600">{progress?.progress || 0}%</span>
                                  <button
                                    onClick={() => cancelTransfer(file.name)}
                                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors"
                                    title={t('uploadSuccess.cancelTransfer')}
                                  >
                                    <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-[#888888]" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-[#666666] mr-4">{t('uploadSuccess.waiting')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#888888] mb-3">
              {t('uploadSuccess.qrDownload')}
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
            onClick={() => navigate('/')}
            className="w-full px-8 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            {t('common.done')}
          </button>
        </div>
      </div>

      {showFailedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl max-w-[30rem] w-full p-6 md:p-8 animate-modal-pop relative">
            <button
              onClick={() => setShowFailedModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title={t('common.close')}
            >
              <XMarkIcon className="w-6 h-6 text-gray-400 dark:text-[#666666]" />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/15 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#EDEDED] text-center mb-3">
              {t('uploadSuccess.p2pConnectionFailed')}
            </h3>
            <p className="text-gray-600 dark:text-[#888888] text-center mb-6 text-sm leading-relaxed">
              {t('uploadSuccess.p2pConnectionFailedDesc')}
              <br />
              {t('uploadSuccess.switchToServer')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetryP2P}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-white/15 text-gray-700 dark:text-[#EDEDED] font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
              >
                {t('common.retry')}
              </button>
              <button
                onClick={handleSwitchToServerUpload}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                {t('common.switchBtn')}
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

      {previewFile && (
        <FilePreviewModal
          file={{
            fileName: previewFile.name,
            fileSize: previewFile.size,
            source: previewFile,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default UploadSuccessPage;
