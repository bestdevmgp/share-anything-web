import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [downloadCode, setDownloadCode] = useState('');

  const handleDownload = () => {
    if (downloadCode.length === 6) {
      navigate(`/download/${downloadCode}`);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setDownloadCode(value);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      {/* Hero Section */}
      <div className="text-center pt-20 pb-16 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          간편한 파일 공유
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          회원가입 없이 빠르고 안전하게 대용량 파일을 공유하세요. 파일을 선택하여 공유 링크를 생성하거나 코드를 입력하여 다운로드하세요.
        </p>
      </div>

      {/* Cards Section */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Send Files Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <ArrowUpTrayIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">파일 업로드</h2>
            <p className="text-gray-600 mb-8">
              파일을 선택하여 안전한 링크를 받으세요.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="w-full max-w-xs px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              업로드
            </button>
          </div>

          {/* Receive Files Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <ArrowDownTrayIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">파일 다운로드</h2>
            <p className="text-gray-600 mb-8">
              공유 코드 6자리를 입력하세요.
            </p>
            <div className="w-full max-w-xs relative">
              <input
                type="text"
                value={downloadCode}
                onChange={handleCodeChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && downloadCode.length === 6) {
                    handleDownload();
                  }
                }}
                placeholder="123456"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-center font-mono text-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleDownload}
                disabled={downloadCode.length !== 6}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  downloadCode.length === 6
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="다운로드"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
