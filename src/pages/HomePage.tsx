import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [downloadCode, setDownloadCode] = useState('');
  const downloadCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'ShareAnything';
    if (location.state?.autoFocus) {
      downloadCodeInputRef.current?.focus();
    }
  }, [location.state]);

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
    <div>
      {/* Hero Section */}
      <div className="text-center pt-20 pb-16 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          간편한 파일 공유
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          회원가입 없이 빠르고 안전하게 대용량 파일을 공유하세요. 파일을 선택하여 공유 링크를 생성하거나 코드를 입력하여 다운로드할 수 있습니다.
        </p>
      </div>

      {/* Cards Section */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Send Files Card */}
          <div className="bg-white rounded-2xl border-[3px] border-gray-100 p-6 md:p-10 flex flex-col items-center text-center">
            <div className="flex items-center md:flex-col md:items-center mb-4 md:mb-6 w-full md:w-auto">
              <ArrowUpTrayIcon className="w-12 h-12 md:w-16 md:h-16 text-blue-600 mr-4 md:mr-0 md:mb-6 flex-shrink-0" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">파일 업로드</h2>
            </div>
            <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base">
              파일을 선택하여 안전한 링크를 받으세요.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="w-full max-w-sm md:max-w-xs px-5 py-3 md:px-10 md:py-3 bg-blue-600 text-white text-base md:text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              업로드
            </button>
          </div>

          {/* Receive Files Card */}
          <div className="bg-white rounded-2xl border-[3px] border-gray-100 p-6 md:p-10 flex flex-col items-center text-center">
            <div className="flex items-center md:flex-col md:items-center mb-4 md:mb-6 w-full md:w-auto">
              <ArrowDownTrayIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-700 mr-4 md:mr-0 md:mb-6 flex-shrink-0" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">파일 다운로드</h2>
            </div>
            <p className="text-gray-600 mb-6 md:mb-8 text-sm md:text-base">
              공유 코드 6자리를 입력하세요.
            </p>
            <div className="w-full max-w-sm md:max-w-xs relative">
              <input
                ref={downloadCodeInputRef}
                type="text"
                value={downloadCode}
                onChange={handleCodeChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && downloadCode.length === 6) {
                    handleDownload();
                  }
                }}
                placeholder="123456"
                className="w-full px-5 py-3 md:px-6 md:py-3 pr-12 border border-gray-300 rounded-xl text-center font-mono text-base md:text-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleDownload}
                disabled={downloadCode.length !== 6}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  downloadCode.length === 6
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
