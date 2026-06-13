import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FileListResponse } from '../../types';
import { formatFileSize } from '../../utils/format';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

import { Checkbox } from '../../components/ui/checkbox';
import FileThumbnail from '../../components/FileThumbnail';
import { cn } from 'lib/utils';

export interface MultiFileListProps {
  fileList: FileListResponse;
  selectedFiles: Set<string>;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  downloading: boolean;
  downloadProgress: number;
  downloadTimeRemaining: string;
  downloadAsZip: boolean;
  handleDownload: (asZip: boolean) => void;
  handleCancelDownload: () => void;
  navigate: NavigateFunction;
  previews?: Record<string, string>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const MultiFileList: React.FC<MultiFileListProps> = ({
  fileList,
  selectedFiles,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  downloading,
  downloadProgress,
  downloadTimeRemaining,
  downloadAsZip,
  handleDownload,
  handleCancelDownload,
  navigate,
  previews,
  t,
}) => {
  return (
    <div className="pt-8 pb-20 px-4 sm:pt-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">{t('download.readyToDownload')}</h1>
          <p className="text-muted-foreground">
            {t('download.totalFilesAvailable', { count: fileList.total_count })}
          </p>
        </div>
        <style>{`
          .download-checkmark-path {
            stroke-dasharray: 20;
            stroke-dashoffset: 20;
            animation: drawDownloadCheck 0.6s ease-out forwards;
          }
          @keyframes drawDownloadCheck {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        <Card className="rounded-2xl sm:rounded-3xl border-2 p-4 pt-6 sm:p-10 sm:pt-[26px]">
          {fileList.description && (
            <div className="mb-8 p-4 bg-muted rounded-lg border border-foreground/[0.09]">
              <p className="text-foreground break-words whitespace-pre-wrap">{fileList.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {t('download.fileListSelected', { selected: selectedFiles.size, total: fileList.total_count })}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                onClick={selectAllFiles}
                size="sm"
                className="text-primary can-hover:hover:bg-primary/10 active:bg-primary/10"
              >
                {t('download.selectAll')}
              </Button>
              <Button
                variant="ghost"
                onClick={deselectAllFiles}
                size="sm"
                className="text-muted-foreground"
              >
                {t('download.deselectAll')}
              </Button>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
            {fileList.files.map((file) => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className={cn(
                  'flex items-center space-x-3 px-3 py-3 rounded-lg cursor-pointer transition-all',
                  selectedFiles.has(file.id)
                    ? 'bg-accent border border-primary'
                    : 'bg-muted border border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent'
                )}
              >
                <div className="flex-shrink-0">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    className="h-6 w-6 rounded-md border-2"
                  />
                </div>

                <div className="flex-shrink-0 hidden sm:flex">
                  <FileThumbnail source={previews?.[file.id] ?? null} fileName={file.file_name} size="md" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {file.file_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="">
            {downloading ? (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {downloadAsZip ? t('download.creatingZip') : t('download.downloadingP2P')}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {downloadProgress === 100 ? (
                          <span className="text-xs text-muted-foreground">{t('upload.pleaseWait')}</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">{downloadTimeRemaining || t('format.calculating')}</span>
                            <span className="text-xs font-semibold text-primary">{downloadProgress}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center h-4 mt-0.5">
                      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-1000 ease-out rounded-full"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelDownload}
                    className="p-1 can-hover:hover:bg-accent active:bg-accent rounded transition-colors flex-shrink-0"
                    title={t('download.cancelDownload')}
                  >
                    <XMarkIcon className="w-6 h-6 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const selectedTotalSize = fileList.files
                  .filter(f => selectedFiles.has(f.id))
                  .reduce((sum, f) => sum + f.file_size, 0);
                const ZIP_SIZE_LIMIT = 500 * 1024 * 1024;
                const canZip = selectedFiles.size > 1 && selectedTotalSize < ZIP_SIZE_LIMIT;
                const hasSelection = selectedFiles.size > 0;

                return (
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleDownload(true)}
                      disabled={!canZip}
                      size="lg"
                      className="flex-1"
                    >
                      {t('download.zipDownload')}
                    </Button>
                    <Button
                      onClick={() => handleDownload(false)}
                      disabled={!hasSelection}
                      size="lg"
                      className="flex-1"
                    >
                      {t('download.individualDownload')}
                    </Button>
                  </div>
                );
              })()
            )}
          </div>

          <div className="mt-3 md:-mb-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
            >
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MultiFileList;
