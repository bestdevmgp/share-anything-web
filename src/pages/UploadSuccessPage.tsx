import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { FileUploadResponse } from '../types';
import { copyToClipboard, formatDateTime } from '../utils/format';
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

const UploadSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '업로드 완료';
  }, []);
  const uploadResult = location.state?.uploadResult as FileUploadResponse | undefined;

  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  if (!uploadResult) {
    navigate('/upload');
    return null;
  }

  // 그룹 공유 코드와 다운로드 URL 생성
  const groupShareCode = uploadResult.share_code || uploadResult.files[0]?.share_code || '';
  const downloadUrl = `${window.location.origin}/download/${groupShareCode}`;

  // 공유 코드를 3-3 형식으로 표시 (123456 → 123 456)
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
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">파일 전송 준비 완료</h1>
          <p className="text-lg text-gray-600">
            코드를 공유하거나 아래 링크를 통해 파일을 다운로드하세요.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xl font-semibold text-green-600">업로드 완료!</p>
          </div>

          {/* Share Code */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 mb-3 text-center">
              전송 코드
            </label>
            <div className="relative bg-gray-50 rounded-xl px-4 md:px-8 py-4 md:py-6 mb-4 border border-gray-300">
              <p className="text-3xl md:text-5xl font-bold text-center text-gray-900 pr-10 md:pr-12 break-all" style={{ letterSpacing: '0.1em' }}>
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
            {uploadResult.files[0]?.expires_at && (
              <p className="text-sm text-gray-500 text-center">
                만료: {formatDateTime(uploadResult.files[0].expires_at)}
              </p>
            )}
          </div>

          {/* Share Link */}
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

          {/* QR Code */}
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

        {/* Complete Button */}
        <div className="mt-10">
          <button
            onClick={() => navigate('/')}
            className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSuccessPage;
