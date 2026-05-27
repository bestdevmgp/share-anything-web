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
  t,
}) => {
  return (
    <div className="pt-8 pb-20 px-4 sm:pt-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-3">{t('download.pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('download.totalFilesAvailable', { count: fileList.total_count })}
          </p>
        </div>

        <Card className="rounded-2xl sm:rounded-3xl border-2 p-4 sm:p-10">
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
                  'flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-all',
                  selectedFiles.has(file.id)
                    ? 'bg-accent border-2 border-primary'
                    : 'bg-muted border-2 border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent'
                )}
              >
                <div className="flex-shrink-0">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    className="h-6 w-6 rounded-md border-2"
                  />
                </div>

                {/* Thumbnail is just a generic file icon (no real preview source) - hide on mobile to give the filename more room. */}
                <div className="flex-shrink-0 hidden sm:flex">
                  <FileThumbnail source={null} fileName={file.file_name} size="md" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-foreground truncate">
                    {file.file_name}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{formatFileSize(file.file_size)}</p>
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
                const canDownloadAsZip = selectedFiles.size > 1 && selectedTotalSize < ZIP_SIZE_LIMIT;

                return canDownloadAsZip ? (
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleDownload(true)}
                      disabled={selectedFiles.size === 0}
                      size="lg"
                      className="flex-1"
                    >
                      {t('download.zipDownload')}
                    </Button>
                    <Button
                      onClick={() => handleDownload(false)}
                      disabled={selectedFiles.size === 0}
                      size="lg"
                      className="flex-1"
                    >
                      {t('download.individualDownload')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleDownload(false)}
                    disabled={selectedFiles.size === 0}
                    size="lg"
                    className="w-full"
                  >
                    {selectedFiles.size === 0
                      ? t('download.selectFilePrompt')
                      : selectedFiles.size === 1
                      ? t('common.download')
                      : t('download.multiFileDownload', { count: selectedFiles.size })
                    }
                  </Button>
                );
              })()
            )}
          </div>

          <div className="mt-3 -mb-2 md:-mb-4 text-center">
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
