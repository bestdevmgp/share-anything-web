import React, { useCallback, useEffect, useRef, useState } from 'react';
import { userAPI } from '../services/api';
import { DownloadLog } from '../types';
import { toast } from '../context/ToastContext';

interface DownloadLogsModalProps {
  fileId: string;
  onClose: () => void;
}

const DownloadLogsModal: React.FC<DownloadLogsModalProps> = ({ fileId, onClose }) => {
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDownloadLogs();
  }, [fileId]);

  useEffect(() => {
    if (!loading && logs.length > 0) {
      const timer = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container && container.scrollWidth > container.clientWidth) {
          setShowScrollHint(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, logs]);

  const dismissScrollHint = useCallback(() => {
    setShowScrollHint(false);
  }, []);

  const fetchDownloadLogs = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getDownloadLogs(fileId);
      setLogs(data);
    } catch (error: any) {
      console.error('Failed to fetch download logs:', error);
      toast.error('다운로드 기록 조회에 실패하였습니다.');
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

        {/* Modal panel */}
        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-full sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                다운로드 기록
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">아직 다운로드 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="relative">
                <div ref={scrollContainerRef} className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          다운로드한 사람
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP 주소
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          플랫폼
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          다운로드 날짜
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.downloader_name || '익명'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.ip_address}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.device_platform}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.downloaded_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Scroll hint overlay */}
                {showScrollHint && (
                  <div
                    className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center cursor-pointer"
                    onClick={dismissScrollHint}
                    onTouchStart={dismissScrollHint}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-12 h-12 text-white animate-scroll-hint-hand"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                      </svg>
                      <span className="text-white text-sm font-medium">좌우로 스크롤하세요</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll-hint-hand {
          0%, 100% { transform: translateX(-12px); opacity: 0.7; }
          50% { transform: translateX(12px); opacity: 1; }
        }
        .animate-scroll-hint-hand {
          animation: scroll-hint-hand 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default DownloadLogsModal;
