import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { formatFileSize, downloadFile, formatDateTime } from '../utils/format';
import { DocumentIcon, LockClosedIcon, CheckIcon, ArrowDownTrayIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const DownloadFilePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    document.title = '파일 다운로드';
  }, []);
  const navigate = useNavigate();

  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const loadFileList = useCallback(async () => {
    if (!code) {
      navigate('/download');
      return;
    }

    try {
      setLoading(true);
      const list = await fileAPI.getFileList(code);
      setFileList(list);

      if (!list.has_password) {
        setPasswordVerified(true);
        // Auto-select first file if single file
        if (list.files.length === 1) {
          setSelectedFiles(new Set([list.files[0].id]));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '찾을 수 없거나 만료된 파일입니다.');
    } finally {
      setLoading(false);
    }
  }, [code, navigate]);

  useEffect(() => {
    loadFileList();
  }, [loadFileList]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !password) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }

    try {
      setLoading(true);

      // 1. 비밀번호 사전 검증
      await fileAPI.verifyPassword(code, password);

      // 2. 검증 성공 시 파일 목록 조회
      const list = await fileAPI.getFileList(code);
      setFileList(list);
      setPasswordVerified(true);
      toast.success('비밀번호가 확인되었습니다.');

      // Auto-select first file if single file
      if (list.files.length === 1) {
        setSelectedFiles(new Set([list.files[0].id]));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('비밀번호가 올바르지 않습니다.');
        setPassword('');
        setShowPassword(false);
      } else {
        toast.error('비밀번호 확인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!code || !fileList || selectedFiles.size === 0) return;

    try {
      setDownloading(true);
      const selectedFileIds = Array.from(selectedFiles);

      if (selectedFileIds.length === 1) {
        const fileId = selectedFileIds[0];
        const file = fileList.files.find(f => f.id === fileId);
        if (!file) return;

        const blob = await fileAPI.downloadFile(code, fileId, password || undefined);
        downloadFile(blob, file.file_name);
        toast.success('파일 다운로드가 완료되었습니다.');
      } else {
        const blob = await fileAPI.downloadBulk({
          code,
          file_ids: selectedFileIds,
          password: password || undefined
        });
        downloadFile(blob, `files_${code}.zip`);
        toast.success(`${selectedFileIds.length}개 파일 다운로드가 완료되었습니다.`);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('비밀번호가 올바르지 않습니다.');
        setPasswordVerified(false);
      } else {
        toast.error('다운로드에 실패했습니다');
      }
    } finally {
      setDownloading(false);
    }
  };


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
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">잘못된 코드</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/download')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!fileList) {
    return null;
  }

  // Password verification screen
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

  // Single file view (like Image #5)
  if (fileList.files.length === 1) {
    const file = fileList.files[0];

    return (
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">다운로드 준비 완료</h1>
            <p className="text-gray-600">
              다운로드를 시작하기 전에 아래 파일 정보를 확인하세요.
            </p>
          </div>

          {/* File Card */}
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-10">
            {/* File Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <DocumentIcon className="w-12 h-12 text-blue-600" />
              </div>
            </div>

            {/* File Info */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center break-all">
                {file.file_name}
              </h2>
              {fileList.description && (
                <p className="text-gray-600 text-center mb-6">
                  {fileList.description}
                </p>
              )}
            </div>

            {/* File Details */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">파일 크기</span>
                <span className="font-semibold text-gray-900">{formatFileSize(file.file_size)}</span>
              </div>
              {fileList.description && (
                <div className="flex justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">업로드한 사람</span>
                  <span className="font-semibold text-gray-900">익명의 사용자</span>
                </div>
              )}
              <div className="flex justify-between py-3">
                <span className="text-gray-600">만료 일시</span>
                <span className="font-semibold text-gray-900">{formatDateTime(fileList.expires_at)}</span>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>{downloading ? '다운로드 중...' : '파일 다운로드'}</span>
            </button>

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

  // Multiple files view
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
              <p className="text-gray-700">{fileList.description}</p>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              파일 목록 ({selectedFiles.size}/{fileList.total_count} 선택됨)
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={selectAllFiles}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                전체 선택
              </button>
              <button
                onClick={deselectAllFiles}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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

                {/* File Icon */}
                <div className="flex-shrink-0">
                  <DocumentIcon className="w-10 h-10 text-blue-600" />
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
          <button
            onClick={handleDownload}
            disabled={selectedFiles.size === 0 || downloading}
            className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {downloading
              ? '다운로드 중...'
              : selectedFiles.size === 0
              ? '파일을 선택하세요'
              : selectedFiles.size === 1
              ? '다운로드'
              : `${selectedFiles.size}개 파일 ZIP으로 다운로드`
            }
          </button>

          {selectedFiles.size > 1 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              ZIP 파일로 압축되어 다운로드됩니다.
            </p>
          )}

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
