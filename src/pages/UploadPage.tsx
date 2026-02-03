import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { fileAPI, workerAPI } from '../services/api';
import { ExpirationOption } from '../types';
import { formatFileSize, isImageFile, isVideoFile, isAudioFile, isTextFile } from '../utils/format';
import { DocumentIcon, XMarkIcon, EyeIcon, EyeSlashIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import TurnstileWidget from '../components/TurnstileWidget';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = '파일 업로드';
  }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiration, setExpiration] = useState<ExpirationOption>('five_minutes');
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadAbortController, setUploadAbortController] = useState<AbortController | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [transferType, setTransferType] = useState<'server' | 'p2p'>('server');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessingFiles(true);

    await new Promise(resolve => setTimeout(resolve, 10));

    setFiles(prev => [...prev, ...acceptedFiles]);

    acceptedFiles.forEach(file => {
      if (isImageFile(file.name)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews(prev => new Map(prev).set(file.name + file.size, reader.result as string));
        };
        reader.readAsDataURL(file);
      }
    });

    setIsProcessingFiles(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    const key = fileToRemove.name + fileToRemove.size;

    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('파일을 선택해주세요');
      return;
    }

    if (!turnstileToken) {
      toast.error('로봇이 아닌지 확인해주세요');
      return;
    }

    const abortController = new AbortController();
    setUploadAbortController(abortController);

    // Upload settings
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk
    const MAX_CONCURRENT_UPLOADS = 6; // Upload 6 chunks in parallel (Worker handles all S3 ops)
    const DIRECT_UPLOAD_THRESHOLD = 50 * 1024 * 1024; // 50MB - use direct upload

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // P2P transfer uses the original upload method
      if (transferType === 'p2p') {
        const response = await fileAPI.upload(
          files,
          description || undefined,
          isAuthenticated && password ? password : undefined,
          isAuthenticated ? expiration : undefined,
          true,
          turnstileToken,
          transferType,
          (progressEvent) => {
            setUploadProgress(progressEvent.percentage);
          },
          abortController.signal
        );

        navigate('/upload/success', {
          state: {
            uploadResult: response,
            uploadedFile: files[0]
          }
        });
        return;
      }

      // Server transfer uses Worker-based multipart upload for edge performance
      // Step 1: Initialize upload session on backend (creates session and storage keys only - no S3 calls)
      const initResponse = await fileAPI.initMultipartUpload({
        files: files.map(file => ({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream'
        })),
        description: description || undefined,
        password: isAuthenticated && password ? password : undefined,
        expiration: isAuthenticated ? expiration : undefined,
        is_one_time: isAuthenticated ? isOneTime : undefined,
        turnstile_token: turnstileToken,
        chunk_size: CHUNK_SIZE
      });

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      // Track completed parts and upload IDs for each file
      const completedFileParts: { [key: string]: { part_number: number; etag: string }[] } = {};
      const workerUploadIds: { [key: string]: string } = {};

      // Track upload progress per part to avoid progress jumping
      const partProgress: { [key: string]: number } = {};
      let completedBytes = 0; // Bytes from fully completed parts

      const updateTotalProgress = () => {
        const inProgressBytes = Object.values(partProgress).reduce((sum, bytes) => sum + bytes, 0);
        const totalUploaded = completedBytes + inProgressBytes;
        const percentage = Math.round((totalUploaded / totalSize) * 100);
        setUploadProgress(Math.min(percentage, 99)); // Cap at 99% until complete
      };

      // Step 2: Upload each file via Worker (all S3/R2 operations happen on Worker)
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const fileInit = initResponse.files[fileIndex];
        const contentType = file.type || 'application/octet-stream';

        completedFileParts[fileInit.storage_key] = [];

        // Use direct upload for small files (faster, less overhead)
        const useDirectUpload = file.size < DIRECT_UPLOAD_THRESHOLD;

        if (useDirectUpload) {
          // Direct upload - single request, no multipart overhead
          const progressKey = `${fileIndex}-direct`;
          partProgress[progressKey] = 0;

          // eslint-disable-next-line no-loop-func
          const result = await workerAPI.directUpload(
            fileInit.storage_key,
            file,
            (loaded) => {
              partProgress[progressKey] = loaded;
              updateTotalProgress();
            },
            abortController.signal
          );

          delete partProgress[progressKey];
          completedBytes += file.size;
          updateTotalProgress();

          // For direct upload, use 'direct' as upload ID and single part with etag
          workerUploadIds[fileInit.storage_key] = 'direct';
          completedFileParts[fileInit.storage_key] = [{ part_number: 1, etag: result.etag }];
        } else {
          // Multipart upload for large files
          const totalParts = fileInit.total_parts;

          // Create multipart upload on Worker (not backend)
          const workerMultipart = await workerAPI.createMultipartUpload(
            fileInit.storage_key,
            contentType
          );
          workerUploadIds[fileInit.storage_key] = workerMultipart.uploadId;

          const allPartNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

          // Upload parts directly to Worker with concurrency limit
          // eslint-disable-next-line no-loop-func
          const uploadPartWithProgress = async (partNumber: number): Promise<{ part_number: number; etag: string }> => {
            if (abortController.signal.aborted) {
              throw new Error('Upload cancelled');
            }

            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const chunkSize = end - start;
            const partKey = `${fileIndex}-${partNumber}`;

            // Initialize this part's progress
            partProgress[partKey] = 0;

            const result = await workerAPI.uploadPart(
              fileInit.storage_key,
              workerMultipart.uploadId,
              partNumber,
              chunk,
              (loaded) => {
                // Update only this part's progress
                partProgress[partKey] = loaded;
                updateTotalProgress();
              },
              abortController.signal
            );

            // Part completed - move from in-progress to completed
            delete partProgress[partKey];
            completedBytes += chunkSize;
            updateTotalProgress();

            return { part_number: result.partNumber, etag: result.etag };
          };

          // Process parts with concurrency limit
          const results: { part_number: number; etag: string }[] = [];
          for (let i = 0; i < allPartNumbers.length; i += MAX_CONCURRENT_UPLOADS) {
            const batch = allPartNumbers.slice(i, i + MAX_CONCURRENT_UPLOADS);
            const batchResults = await Promise.all(batch.map(uploadPartWithProgress));
            results.push(...batchResults);
          }

          // Sort by part number and store
          completedFileParts[fileInit.storage_key] = results.sort((a, b) => a.part_number - b.part_number);

          // Complete multipart upload on Worker
          await workerAPI.completeMultipartUpload(
            fileInit.storage_key,
            workerMultipart.uploadId,
            completedFileParts[fileInit.storage_key].map(p => ({ partNumber: p.part_number, etag: p.etag }))
          );
        }
      }

      // Step 3: Finalize on backend (DB records only - no S3 calls)
      const response = await fileAPI.completeMultipartUpload({
        upload_session_id: initResponse.upload_session_id,
        share_code: initResponse.share_code,
        files: initResponse.files.map((fileInit, i) => ({
          file_name: fileInit.file_name,
          storage_key: fileInit.storage_key,
          upload_id: workerUploadIds[fileInit.storage_key],
          file_size: files[i].size,
          content_type: files[i].type || 'application/octet-stream',
          parts: completedFileParts[fileInit.storage_key]
        }))
      });

      setUploadProgress(100);

      navigate('/upload/success', {
        state: {
          uploadResult: response,
          uploadedFile: undefined
        }
      });
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.message === 'Upload cancelled') {
        toast.info('업로드가 취소되었습니다.');
      } else if (err.response?.status === 400) {
        toast.error(err.response?.data?.message || '보안 확인이 필요합니다.');
        setTurnstileToken('');
      } else if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || '보안 확인에 실패했습니다. 다시 시도해주세요.');
        setTurnstileToken('');
      } else {
        toast.error(err.response?.data?.message || '업로드에 실패하였습니다.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadAbortController(null);
      setTurnstileToken('');
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
  };

  const handleTransferTypeChange = (type: 'server' | 'p2p') => {
    setTransferType(type);
    if (type === 'p2p') {
      setIsOneTime(true);
    }
  };

  const expirationOptions: { value: ExpirationOption; label: string }[] = [
    { value: 'five_minutes', label: '5분' },
    { value: 'thirty_minutes', label: '30분' },
    { value: 'one_hour', label: '1시간' },
    { value: 'three_hours', label: '3시간' },
    { value: 'six_hours', label: '6시간' },
    { value: 'twelve_hours', label: '12시간' },
    { value: 'twenty_four_hours', label: '24시간' },
  ];

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-12 md:pb-32">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">파일 전송</h1>
          <p className="text-lg text-gray-600">파일과 비밀번호는 암호화되어 보관되며 유효 기간이 지나면 즉시 폐기됩니다.</p>
        </div>

        {/* Transfer Type Selector */}
        <div className="mb-10">
          <div className="relative flex gap-1 w-full max-w-md bg-gray-100 rounded-full p-1.5">
            {/* Sliding Background */}
            <div
              className="absolute top-1.5 h-[calc(100%-12px)] bg-white rounded-full transition-all duration-200 ease-out"
              style={{
                width: 'calc(50% - 8px)',
                left: transferType === 'server' ? '6px' : 'calc(50% + 2px)',
              }}
            />

            {/* Buttons */}
            <button
              type="button"
              onClick={() => handleTransferTypeChange('server')}
              className={`relative z-10 flex-1 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                transferType === 'server'
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-800'
              }`}
            >
              일반 전송
            </button>
            <button
              type="button"
              onClick={() => handleTransferTypeChange('p2p')}
              className={`relative z-10 flex-1 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                transferType === 'p2p'
                  ? 'text-gray-900'
                  : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-800'
              }`}
            >
              보안 전송
            </button>
          </div>
          {transferType === 'p2p' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-gray-700">
              <p className="font-semibold text-blue-900 mb-1">보안 전송 안내</p>
              <p>• WebRTC를 사용한 1:1 직접 전송으로 파일이 서버에 저장되지 않습니다.</p>
              <p>• 일회성 전송만 가능하며, 업로더와 다운로더가 동시에 온라인이어야 합니다.</p>
            </div>
          )}
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

        {/* File Processing */}
        {isProcessingFiles && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-gray-700">파일 처리 중...</p>
          </div>
        )}

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
                    {isImageFile(file.name) && filePreviews.get(file.name + file.size) ? (
                      <img
                        src={filePreviews.get(file.name + file.size)}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : isVideoFile(file.name) ? (
                      <div className="w-12 h-12 flex-shrink-0 bg-purple-50 rounded flex items-center justify-center">
                        <FilmIcon className="w-7 h-7 text-purple-600" />
                      </div>
                    ) : isAudioFile(file.name) ? (
                      <div className="w-12 h-12 flex-shrink-0 bg-green-50 rounded flex items-center justify-center">
                        <MusicalNoteIcon className="w-7 h-7 text-green-600" />
                      </div>
                    ) : isTextFile(file.name) ? (
                      <div className="w-12 h-12 flex-shrink-0 bg-yellow-50 rounded flex items-center justify-center">
                        <DocumentTextIcon className="w-7 h-7 text-yellow-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded flex items-center justify-center">
                        <DocumentIcon className="w-7 h-7 text-gray-400" />
                      </div>
                    )}
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">전송 설정</h2>

          {/* Expiration */}
          <div className="mb-8">
            <h3 className={`text-base font-semibold text-gray-900 ${!isAuthenticated ? 'mb-1' : 'mb-4'}`}>유효 기간</h3>
            {!isAuthenticated && (
              <p className="mb-4 text-sm text-gray-500">
                로그인 후 사용 가능합니다.
              </p>
            )}
            <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
              {expirationOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setExpiration(option.value)}
                  disabled={!isAuthenticated && option.value !== 'five_minutes'}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors ${
                    expiration === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${!isAuthenticated && option.value !== 'five_minutes' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* One Time Download Checkbox */}
            {isAuthenticated && (
              <div className="mt-4">
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isOneTime}
                      onChange={(e) => setIsOneTime(e.target.checked)}
                      disabled={transferType === 'p2p'}
                      className="sr-only"
                    />
                    <div
                      onClick={() => transferType !== 'p2p' && setIsOneTime(!isOneTime)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isOneTime
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      } ${
                        transferType !== 'p2p' ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isOneTime && (
                        <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <span
                    onClick={() => transferType !== 'p2p' && setIsOneTime(!isOneTime)}
                    className={`ml-2.5 text-base font-medium ${transferType !== 'p2p' ? 'cursor-pointer' : 'cursor-not-allowed'} ${transferType === 'p2p' ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    일회용 다운로드
                    {transferType === 'p2p' && <span className="text-xs ml-1">(보안 전송 필수)</span>}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              비밀번호 <span className="text-sm text-gray-400 font-normal">선택</span>
            </h3>
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
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              설명 <span className="text-sm text-gray-400 font-normal">선택</span>
            </h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="파일에 대한 간단한 설명을 입력하세요..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Turnstile Widget & Submit Button */}
        <div className="mt-7">
          {isUploading ? (
            <div className="bg-blue-50 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 pl-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 self-start">
                      {uploadProgress === 100 ? '잠시만 기다려주세요...' : '업로드 중...'}
                    </span>
                    {uploadProgress < 100 && (
                      <span className="text-xs font-semibold text-blue-600 self-end">{uploadProgress}%</span>
                    )}
                  </div>
                  <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                  title="업로드 취소"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[22px] md:gap-4">
              {/* Turnstile Widget */}
              <div>
                <TurnstileWidget
                  onVerify={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setTurnstileToken('');
                    toast.error('보안 확인에 실패했습니다. 다시 시도해주세요.');
                  }}
                  onExpire={() => {
                    setTurnstileToken('');
                  }}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center md:justify-end">
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0 || !turnstileToken}
                  className="w-full md:w-auto px-10 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  업로드
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
