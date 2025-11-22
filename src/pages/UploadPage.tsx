import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { fileAPI } from '../services/api';
import { ExpirationOption } from '../types';
import { formatFileSize } from '../utils/format';
import { DocumentIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = '파일 업로드';
  }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>('one_day');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('파일을 선택해주세요');
      return;
    }

    try {
      setIsUploading(true);

      const response = await fileAPI.upload(
        files,
        description || undefined,
        isAuthenticated && password ? password : undefined,
        isAuthenticated ? expiration : undefined
      );

      navigate('/upload/success', { state: { uploadResult: response } });
    } catch (err: any) {
      toast.error(err.response?.data?.message || '업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const expirationOptions: { value: ExpirationOption; label: string; requiresAuth?: boolean }[] = [
    { value: 'one_time', label: '일회용', requiresAuth: true },
    { value: 'one_hour', label: '1시간' },
    { value: 'one_day', label: '1일' },
    { value: 'three_days', label: '3일' },
    { value: 'one_week', label: '1주일' },
    { value: 'one_month', label: '1개월' },
  ];

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">파일 전송</h1>
          <p className="text-lg text-gray-600">파일은 암호화되어 보관되며 유효 기간이 지나면 즉시 폐기됩니다.</p>
        </div>

        {/* File Drop Zone */}
        <div className="mb-10">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-6 md:p-16 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6">
              <DocumentIcon className="w-7 h-7 md:w-10 md:h-10 text-blue-600" />
            </div>
            <p className="text-sm md:text-xl font-semibold text-gray-900 mb-1 md:mb-2">
              여기에 파일을 드래그하거나 클릭하여 업로드하세요.
            </p>
            <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-6">
              로그인 시 최대 3GB까지 업로드할 수 있습니다.
            </p>
            <button
              type="button"
              className="px-6 py-2 md:px-8 md:py-3 bg-gray-100 text-gray-700 text-sm md:text-base font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              파일 선택
            </button>
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mb-10">
            <h3 className="font-semibold text-gray-900 mb-4">선택된 파일 ({files.length})</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 p-1 hover:bg-gray-300 rounded"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transfer Settings */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">전송 설정</h2>

          {/* Expiration */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">유효 기간</h3>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {expirationOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setExpiration(option.value)}
                  disabled={!isAuthenticated && option.value !== 'one_day'}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors ${
                    expiration === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${!isAuthenticated && option.value !== 'one_day' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!isAuthenticated && (
              <p className="mt-3 text-sm text-gray-500">
                로그인 후 사용 가능합니다.
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">비밀번호 (선택)</h3>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isAuthenticated}
                placeholder={isAuthenticated ? "다운로드 비밀번호" : "로그인 후 사용 가능합니다."}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200 disabled:text-gray-400"
              />
              {isAuthenticated ? (
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
              ) : (
                <div className="absolute right-4 top-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">설명 (선택)</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="파일에 대한 간단한 설명을 입력하세요..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="w-full md:w-auto px-10 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
