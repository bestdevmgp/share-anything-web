import React, { useMemo, useState } from 'react';
import { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { DocumentIcon, XMarkIcon, PlusIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { cn } from 'lib/utils';
import { useTranslation } from '../../i18n';
import FileThumbnail from '../../components/FileThumbnail';
import TruncatedFilename from '../../components/TruncatedFilename';
import AnimatedHeight from '../../components/UnifiedFileBox/AnimatedHeight';
import FolderTreeRows, { treeIndent } from '../../components/UnifiedFileBox/FolderTreeRows';
import { buildFileTree, collectFileIds, nodeFileCount, nodeSize } from '../../utils/fileTree';
import { formatFileSize } from '../../utils/format';
import { getRelativePathSafe } from '../../utils/fileWithPath';

export interface FileDropzoneProps {
  files: File[];
  transferType: 'server' | 'p2p';
  isAuthenticated: boolean;
  isDragActive: boolean;
  isProcessingFiles: boolean;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  onRemoveFile: (index: number) => void;
  onRemoveFiles: (indices: number[]) => void;
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
  onRemoveFiles,
  onPreviewFile,
  onSelectFolder,
  folderInputRef,
  onFolderInputChange,
}) => {
  const { t } = useTranslation();

  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  // Files are keyed by their array index (id) so removal maps back to onRemoveFile.
  const tree = useMemo(
    () =>
      buildFileTree(
        files.map((f, i) => ({
          id: String(i),
          file_name: f.name,
          file_size: f.size,
          relative_path: getRelativePathSafe(f),
        }))
      ),
    [files]
  );

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  const toggleFolder = (name: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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
              <div className="grid grid-cols-2 gap-2 w-fit">
                <Button variant="default" size="lg" className="w-full">
                  {t('upload.selectFiles')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFolder();
                  }}
                >
                  {t('upload.selectFolder')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mt-0.5 md:mt-0 mb-3.5 md:mb-4 flex-shrink-0">
                <h3 className="font-semibold text-foreground">{t('upload.selectedFiles', { count: files.length })}</h3>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{formatFileSize(totalSize)}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0" style={{ containerType: 'inline-size' }}>
                {tree.map((node) => {
                  if (node.kind === 'file') {
                    const index = Number(node.id);
                    const file = files[index];
                    return (
                      <div
                        key={node.id}
                        onClick={(e) => { e.stopPropagation(); onPreviewFile(file); }}
                        className="flex items-center gap-3 p-3.5 bg-muted rounded-lg border border-foreground/[0.09] can-hover:hover:bg-accent active:bg-accent transition-colors cursor-pointer"
                      >
                        <FileThumbnail source={file} fileName={file.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                          className="ml-1 -mr-1 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors flex-shrink-0"
                        >
                          <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  }
                  const isOpen = openFolders.has(node.path);
                  return (
                    <div key={`folder:${node.path}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                      <div
                        role="button"
                        onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}
                        className="flex items-center gap-3 p-3.5 cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                      >
                        <div className="w-11 h-11 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <FolderIcon className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-foreground truncate">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/50 transition-transform', isOpen && 'rotate-180')} />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemoveFiles(collectFileIds(node).map(Number)); }}
                            className="-mr-1 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <AnimatedHeight>
                        {isOpen && (
                          <div className="px-3.5 pb-3">
                            <div className="border-t border-foreground/[0.08] pt-2.5 space-y-1">
                              <FolderTreeRows
                                nodes={node.children}
                                depth={1}
                                openFolders={openFolders}
                                toggleFolder={toggleFolder}
                                t={t}
                                renderFolderTrailing={(folderNode) => (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onRemoveFiles(collectFileIds(folderNode).map(Number)); }}
                                    className="-mr-0.5 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors flex-shrink-0"
                                  >
                                    <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                )}
                                renderFile={(fileNode, depth) => {
                                  const index = Number(fileNode.id);
                                  const file = files[index];
                                  return (
                                    <div
                                      data-row
                                      onClick={(e) => { e.stopPropagation(); onPreviewFile(file); }}
                                      className="flex items-center gap-3 min-w-0 py-2 rounded-md cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                                      style={{ paddingLeft: treeIndent(depth) }}
                                    >
                                      <FileThumbnail source={file} fileName={file.name} size="sm" />
                                      <div className="flex-1 min-w-0">
                                        <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                                        className="ml-1 -mr-0.5 p-1 can-hover:hover:bg-foreground/10 active:bg-foreground/10 rounded-md transition-colors flex-shrink-0"
                                      >
                                        <XMarkIcon className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                    </div>
                                  );
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </AnimatedHeight>
                    </div>
                  );
                })}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="p-3.5 border-2 border-dashed border-input rounded-lg flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground/60 can-hover:hover:text-muted-foreground can-hover:hover:border-foreground/40 active:text-muted-foreground active:border-foreground/40 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    {t('upload.addFiles')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelectFolder(); }}
                    className="p-3.5 border-2 border-dashed border-input rounded-lg flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground/60 can-hover:hover:text-muted-foreground can-hover:hover:border-foreground/40 active:text-muted-foreground active:border-foreground/40 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5" />
                    {t('upload.addFolder')}
                  </button>
                </div>
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
