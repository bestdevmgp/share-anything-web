import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUploadResponse } from '../types';
import { copyToClipboard, formatDateTime } from '../utils/format';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useP2PUploader } from '../hooks/useP2PUploader';

const UploadSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '업로드 완료';
  }, []);

  const uploadResult = location.state?.uploadResult as FileUploadResponse | undefined;
  const uploadedFile = location.state?.uploadedFile as File | undefined;

  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const isP2PTransfer = uploadResult?.files?.[0]?.transfer_type === 'p2p';
  const groupShareCode = uploadResult?.share_code || uploadResult?.files?.[0]?.share_code || '';

  const { status: p2pStatus, progress: transferProgress, timeRemaining } = useP2PUploader({
    shareCode: groupShareCode,
    file: uploadedFile!,
    enabled: isP2PTransfer && !!uploadedFile && !!uploadResult
  });

  if (!uploadResult) {
    navigate('/upload');
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

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              !isP2PTransfer || p2pStatus === 'completed' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {isP2PTransfer && p2pStatus !== 'completed' ? (
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
              p2pStatus === 'waiting' ? '수신자 대기 중...' :
              p2pStatus === 'connected' ? '수신자 연결됨' :
              p2pStatus === 'transferring' ? '파일 전송 중...' :
              '전송 완료!'
            ) : '업로드 완료'}
          </h1>
          <p className="text-lg text-gray-600">
            {isP2PTransfer ? (
              p2pStatus === 'waiting' ? '수신자가 연결될 때까지 이 페이지를 닫지 마세요.' :
              p2pStatus === 'completed' ? '파일이 성공적으로 전송되었습니다!' :
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

          {isP2PTransfer && (p2pStatus === 'transferring' || p2pStatus === 'connected') && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">
                  전송 진행률
                </label>
                {timeRemaining && (
                  <span className="text-sm text-gray-500">{timeRemaining} 남음</span>
                )}
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${transferProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                {transferProgress}%
              </p>
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
            onClick={() => navigate('/')}
            className="w-full px-8 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSuccessPage;
