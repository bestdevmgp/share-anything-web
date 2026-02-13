import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';
import QuickAccess from '../components/QuickAccess';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [downloadCode, setDownloadCode] = useState('');
  const downloadCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'ShareAnything';
    if (location.state?.autoFocus) {
      downloadCodeInputRef.current?.focus();
    }
  }, [location.state]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        downloadCodeInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownload = () => {
    if (downloadCode.length === 6) {
      navigate(`/download/${downloadCode}`);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      setDownloadCode(value);
    }
  };

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <QuickAccess />
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl border-[3px] border-gray-100 dark:border-white/10 p-6 md:p-10 flex flex-col items-center text-center">
            <div className="flex items-center md:flex-col md:items-center mb-4 md:mb-6 w-full md:w-auto">
              <ArrowUpTrayIcon className="w-12 h-12 md:w-16 md:h-16 text-blue-600 mr-4 md:mr-0 md:mb-6 flex-shrink-0" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">{t('home.uploadTitle')}</h2>
            </div>
            <p className="text-gray-600 dark:text-[#888888] mb-6 md:mb-8 text-sm md:text-base">
              {t('home.uploadDescription')}
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="w-full max-w-sm md:max-w-xs px-5 py-3 md:px-10 md:py-3 bg-blue-600 text-white text-base md:text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t('home.uploadButton')}
            </button>
          </div>

          <div className="bg-white dark:bg-[#0B0A0B] rounded-2xl border-[3px] border-gray-100 dark:border-white/10 p-6 md:p-10 flex flex-col items-center text-center">
            <div className="flex items-center md:flex-col md:items-center mb-4 md:mb-6 w-full md:w-auto">
              <ArrowDownTrayIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-700 dark:text-[#EDEDED] mr-4 md:mr-0 md:mb-6 flex-shrink-0" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">{t('home.downloadTitle')}</h2>
            </div>
            <p className="text-gray-600 dark:text-[#888888] mb-6 md:mb-8 text-sm md:text-base">
              {t('home.downloadDescription')}
            </p>
            <div className="w-full max-w-sm md:max-w-xs relative">
              <input
                ref={downloadCodeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={downloadCode}
                onChange={handleCodeChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && downloadCode.length === 6) {
                    handleDownload();
                  }
                }}
                placeholder="123456"
                className="w-full px-5 py-3 md:px-6 md:py-3 pr-12 border border-gray-300 dark:border-white/15 dark:bg-[#0B0A0B] dark:text-[#EDEDED] dark:placeholder-[#666666] rounded-xl text-center font-mono text-base md:text-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleDownload}
                disabled={downloadCode.length !== 6}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  downloadCode.length === 6
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 dark:bg-white/10 text-gray-500 dark:text-[#666666] cursor-not-allowed'
                }`}
                title={t('home.downloadButton')}
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
