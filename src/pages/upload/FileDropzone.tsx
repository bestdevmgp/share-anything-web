import React, { useMemo } from 'react';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { DocumentIcon, XMarkIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { cn } from 'lib/utils';
import { useTranslation } from '../../i18n';
import FileThumbnail from '../../components/FileThumbnail';
import FileTree from '../../components/FileTree';
import { formatFileSize } from '../../utils/format';
import { getRelativePathSafe } from '../../utils/fileWithPath';
import { FlatTreeItem, hasFolders } from '../../utils/folderPath';

export interface FileDropzoneProps {
  files: File[];
  transferType: 'server' | 'p2p';
  isAuthenticated: boolean;
  isDragActive: boolean;
  isProcessingFiles: boolean;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  onRemoveFile: (index: number) => void;
  onPreviewFile: (file: File) => void;
  onSelectFolder: () => void;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onFolderInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  transferType,
  isAuthenticated,
  isDragActive,
  isProcessingFiles,
  getRootProps,
  getInputProps,
  onRemoveFile,
  onPreviewFile,
  onSelectFolder,
  folderInputRef,
  onFolderInputChange,
}) => {
  const { t } = useTranslation();

  const treeItems = useMemo<FlatTreeItem[]>(
    () =>
      files.map((file, index) => ({
        id: String(index),
        name: file.name,
        size: file.size,
        relativePath: getRelativePathSafe(file),
      })),
    [files]
  );

  const showTree = files.length > 1 && hasFolders(treeItems);
  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  return (
    <>
      <div className="mb-10">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-2xl cursor-pointer transition-colors h-[calc(100vw-2rem)] md:h-[30rem]',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-input bg-card can-hover:hover:border-foreground/40 active:border-foreground/40',
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
                {t('upload.dropzoneTextFolder', { action: transferType === 'p2p' ? t('upload.dropzoneActionTransfer') : t('upload.dropzoneActionUpload') })}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-6">
                {transferType === 'p2p'
                  ? t('upload.p2pSizeNotice')
                  : isAuthenticated
                    ? t('upload.maxSizeNotice')
                    : <><span className="inline-block">{t('upload.maxSizeNoticeGuest1')}</span>{' '}<span className="inline-block">{t('upload.maxSizeNoticeGuest2')}</span></>}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" size="lg">
                  {t('upload.selectFiles')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFolder();
                  }}
                >
                  <FolderIcon className="w-5 h-5 mr-1.5" />
                  {t('upload.selectFolder')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mt-0.5 md:mt-0 mb-3.5 md:mb-4 flex-shrink-0">
                <h3 className="font-semibold text-foreground">{t('upload.selectedFiles', { count: files.length })}</h3>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(totalSize)}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {showTree ? (
                  <FileTree
                    items={treeItems}
                    onFileClick={(item) => {
                      const file = files[Number(item.id)];
                      if (file) onPreviewFile(file);
                    }}
                    renderFileLeading={(item) => {
                      const file = files[Number(item.id)];
                      return file ? <FileThumbnail source={file} fileName={file.name} size="sm" /> : null;
                    }}
                    renderFileTrailing={(item) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveFile(Number(item.id)); }}
                        className="ml-1 -mr-1 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors flex-shrink-0"
                      >
                        <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  />
                ) : (
                  files.map((file, index) => (
                    <div
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewFile(file);
                      }}
                      className="flex items-center justify-between p-3.5 bg-muted rounded-lg border border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent transition-colors cursor-pointer"
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
                        className="ml-1 -mr-1 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  className="w-full p-3.5 border-2 border-dashed border-input rounded-lg flex items-center justify-center text-muted-foreground/50 can-hover:hover:text-muted-foreground can-hover:hover:border-foreground/40 active:text-muted-foreground active:border-foreground/40 transition-colors"
                >
                  <PlusIcon className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard but widely supported directory attrs
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={onFolderInputChange}
      />

      {isProcessingFiles && (
        <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-foreground">{t('upload.processingFiles')}</p>
        </div>
      )}
    </>
  );
};

export default FileDropzone;
