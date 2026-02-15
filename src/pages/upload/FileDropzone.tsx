import React from 'react';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { DocumentIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { cn } from 'lib/utils';
import { useTranslation } from '../../i18n';
import FileThumbnail from '../../components/FileThumbnail';
import { formatFileSize } from '../../utils/format';

export interface FileDropzoneProps {
  files: File[];
  transferType: 'server' | 'p2p';
  isDragActive: boolean;
  isProcessingFiles: boolean;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  onRemoveFile: (index: number) => void;
  onPreviewFile: (file: File) => void;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  transferType,
  isDragActive,
  isProcessingFiles,
  getRootProps,
  getInputProps,
  onRemoveFile,
  onPreviewFile,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-10">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-2xl cursor-pointer transition-colors h-[calc(100vw-2rem)] md:h-[30rem]',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-input bg-card hover:border-foreground/40',
            files.length > 0 ? 'p-4 md:p-6 flex flex-col' : 'p-6 md:p-16 text-center'
          )}
        >
          <input {...getInputProps()} />

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6">
                <DocumentIcon className="w-7 h-7 md:w-10 md:h-10 text-primary" />
              </div>
              <p className="text-sm md:text-xl font-semibold text-foreground mb-1 md:mb-2">
                {t('upload.dropzoneText', { action: transferType === 'p2p' ? t('upload.dropzoneActionTransfer') : t('upload.dropzoneActionUpload') })}
              </p>
              {transferType !== 'p2p' && (
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-6">
                  {t('upload.maxSizeNotice')}
                </p>
              )}
              {transferType === 'p2p' && <div className="mb-3 md:mb-6" />}
              <Button variant="secondary" size="lg">
                {t('upload.selectFiles')}
              </Button>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-foreground mt-0.5 md:mt-0 mb-3.5 md:mb-4 flex-shrink-0">{t('upload.selectedFiles', { count: files.length })}</h3>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {files.map((file, index) => (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewFile(file);
                    }}
                    className="flex items-center justify-between p-3.5 bg-muted rounded-lg border border-foreground/[0.09] md:hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileThumbnail source={file} fileName={file.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                      className="ml-2 p-1 hover:bg-accent rounded"
                    >
                      <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="w-full p-3.5 border-2 border-dashed border-input rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/30 transition-colors"
                >
                  <PlusIcon className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isProcessingFiles && (
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-foreground">{t('upload.processingFiles')}</p>
        </div>
      )}
    </>
  );
};

export default FileDropzone;
