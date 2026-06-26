import React, { useMemo, useState } from 'react';
import { XMarkIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import PauseBarsIcon from '../PauseBarsIcon';
import { useTranslation } from '../../i18n';
import { Button } from '../ui/button';
import { Hint } from '../ui/Hint';
import { Spinner } from '../ui/spinner';
import FileThumbnail from '../FileThumbnail';
import TruncatedFilename from '../TruncatedFilename';
import ScrollableFileList from './ScrollableFileList';
import FolderTreeRows, { treeIndent } from './FolderTreeRows';
import Collapsible from './Collapsible';
import { FileProgress } from '../../hooks/useP2PUploader';
import { fileKey, getRelativePathSafe } from '../../utils/fileWithPath';
import {
  buildFileTree,
  nodeFileCount,
  nodeSize,
  toggleFolderOpen,
  countVisibleRows,
  hasFolders as treeHasFolders,
} from '../../utils/fileTree';
import { formatFileSize } from '../../utils/format';
import { cn } from '../../lib/utils';

type P2PStatus = 'waiting' | 'connected' | 'transferring' | 'waiting_for_next' | 'completed';

interface Props {
  status: P2PStatus;
  files: File[];
  fileProgresses: Map<string, FileProgress>;
  peerDeviceInfo: string | null;
  completed: boolean;
  onCancel: () => void;
  onCancelFile: (fileName: string) => void;
  onNew: () => void;
}

const P2PActiveStage: React.FC<Props> = ({
  status,
  files,
  fileProgresses,
  peerDeviceInfo,
  completed,
  onCancel,
  onCancelFile,
  onNew,
}) => {
  const { t } = useTranslation();

  const fileByKey = useMemo(() => new Map(files.map((f) => [fileKey(f), f] as const)), [files]);
  const tree = useMemo(
    () =>
      buildFileTree(
        files.map((f) => ({
          id: fileKey(f),
          file_name: f.name,
          file_size: f.size,
          relative_path: getRelativePathSafe(f) || '',
        })),
        []
      ),
    [files]
  );
  const hasFolders = treeHasFolders(tree);
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => {
    // Default every folder open so the sender can watch each file's progress.
    const set = new Set<string>();
    files.forEach((f) => {
      const parts = (getRelativePathSafe(f) || '').split('/');
      parts.pop();
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        set.add(acc);
      }
    });
    return set;
  });

  const allFilesCompleted =
    files.length > 0 && files.every((f) => fileProgresses.get(fileKey(f))?.status === 'completed');
  const transferredCount = files.filter(
    (f) => fileProgresses.get(fileKey(f))?.status === 'completed'
  ).length;
  const anyFileTransferring = files.some(
    (f) => fileProgresses.get(fileKey(f))?.status === 'transferring'
  );

  const overall =
    completed || status === 'completed' || allFilesCompleted
      ? 'completed'
      : anyFileTransferring
        ? 'transferring'
        : status === 'connected'
          ? 'connected'
          : status === 'waiting_for_next'
            ? 'waiting_for_next'
            : 'connected';

  const isDone = overall === 'completed';
  const greenCircle =
    overall === 'connected' || overall === 'waiting_for_next' || overall === 'completed';

  const title =
    overall === 'connected'
      ? t('uploadSuccess.receiverConnected')
      : overall === 'waiting_for_next'
        ? t('uploadSuccess.waitingForNextRequest')
        : overall === 'completed'
          ? t('uploadSuccess.transferComplete')
          : t('uploadSuccess.transferring');

  const description =
    overall === 'connected'
      ? t('uploadSuccess.connectedReadyToDownload', { device: peerDeviceInfo || '' })
      : overall === 'waiting_for_next'
        ? t('uploadSuccess.waitingForNextRequestDesc')
        : overall === 'completed'
          ? transferredCount < files.length
            ? t('uploadSuccess.filesTransferred', { count: transferredCount })
            : t('uploadSuccess.allFilesTransferred')
          : peerDeviceInfo
            ? t('uploadSuccess.connectedTo', { device: peerDeviceInfo })
            : t('uploadSuccess.transferringPleaseWait');

  const toggleFolder = (path: string) => setOpenFolders((prev) => toggleFolderOpen(prev, path));
  const visibleRowCount = countVisibleRows(tree, (path) => openFolders.has(path));

  // One file row (thumbnail + name + per-file progress + cancel), shared by loose files and folder children.
  const senderRow = (file: File) => {
    const progress = fileProgresses.get(fileKey(file));
    const pct = progress?.progress ?? 0;
    const st = progress?.status ?? 'waiting';
    const isTransferring = st === 'transferring';
    return (
      <>
        <div className="flex-shrink-0 mr-3">
          <FileThumbnail source={file} fileName={file.name} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('transition-transform duration-300 ease-out', !isTransferring && 'translate-y-[7px]')}>
            <TruncatedFilename name={file.name} className="text-sm font-medium text-foreground" />
            <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
              {st === 'completed' ? (
                <span className="text-xs font-medium text-green-600">✓ {t('uploadSuccess.completed')}</span>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(file.size)}</span>
                  {isTransferring && (
                    <div className="flex items-center gap-2">
                      {progress?.timeRemaining && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{progress.timeRemaining}</span>
                      )}
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">{pct}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-2 h-1.5">
            <div className={cn('w-full h-full bg-secondary rounded-full overflow-hidden transition-opacity duration-300', isTransferring ? 'opacity-100' : 'opacity-0')}>
              <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        {!isDone && (isTransferring || st === 'waiting') ? (
          <Hint label={t('common.cancel')}>
            <button
              onClick={() => onCancelFile(fileKey(file))}
              className="flex-shrink-0 self-center ml-1 -mr-1 p-1 rounded-md transition-colors text-muted-foreground can-hover:hover:bg-accent active:bg-accent"
              aria-label={t('common.cancel')}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </Hint>
        ) : null}
      </>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col px-6 md:px-8 py-8 md:py-5 animate-in fade-in-0 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        .p2p-stage-check {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: drawP2PStageCheck 0.6s ease-out forwards;
        }
        @keyframes drawP2PStageCheck { to { stroke-dashoffset: 0; } }
      `}</style>

      <div className="flex-1 flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8 min-h-0">
        <div className="flex flex-col items-center justify-center text-center md:flex-1">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4',
              greenCircle
                ? 'bg-green-100 dark:bg-green-500/15'
                : 'bg-card border border-foreground/[0.09]'
            )}
          >
            {overall === 'completed' ? (
              <svg
                className="w-9 h-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" className="p2p-stage-check" />
              </svg>
            ) : overall === 'connected' ? (
              <svg
                className="w-9 h-9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            ) : overall === 'waiting_for_next' ? (
              <PauseBarsIcon className="w-9 h-9 text-green-600" />
            ) : (
              <Spinner size="xl" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1.5">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="md:flex-1 flex flex-col min-w-0" style={{ containerType: 'inline-size' }}>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {t('uploadSuccess.fileList', { count: files.length })}
          </p>
          <ScrollableFileList
            count={hasFolders ? visibleRowCount : files.length}
            recomputeKey={hasFolders ? Array.from(openFolders).sort().join('|') : undefined}
          >
            {hasFolders ? (
              tree.map((node) => {
                if (node.kind === 'file') {
                  const f = fileByKey.get(node.id);
                  return f ? (
                    <div key={node.id} data-row className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]">
                      {senderRow(f)}
                    </div>
                  ) : null;
                }
                if (node.children.length === 0) return null;
                const isOpen = openFolders.has(node.path);
                return (
                  <div key={`folder:${node.path}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                    <div
                      data-row
                      onClick={() => toggleFolder(node.path)}
                      className="flex items-center px-3 py-3 cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors"
                    >
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-11 h-11 rounded bg-background flex items-center justify-center">
                          <FolderIcon className="w-7 h-7 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}
                        </p>
                      </div>
                      <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/60 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                    </div>
                    <Collapsible open={isOpen}>
                      <div className="px-3 pb-3">
                        <div className="border-t border-foreground/[0.08] pt-2.5 space-y-1">
                          <FolderTreeRows
                            nodes={node.children}
                            depth={1}
                            openFolders={openFolders}
                            toggleFolder={toggleFolder}
                            t={t}
                            renderFile={(tf, depth) => {
                              const f = fileByKey.get(tf.id);
                              return f ? (
                                <div data-row className="flex items-center -mx-2.5 px-2.5 py-2 rounded-lg" style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}>
                                  {senderRow(f)}
                                </div>
                              ) : null;
                            }}
                          />
                        </div>
                      </div>
                    </Collapsible>
                  </div>
                );
              })
            ) : (
              files.map((file) => (
                <div key={fileKey(file)} data-row className="flex items-center px-3 py-2 bg-muted rounded-lg border border-foreground/[0.09]">
                  {senderRow(file)}
                </div>
              ))
            )}
          </ScrollableFileList>
        </div>
      </div>

      <Button
        onClick={isDone ? onNew : onCancel}
        variant={isDone ? 'default' : 'outline'}
        size="lg"
        className="w-full mt-6 -mb-2 md:mb-1"
      >
        {isDone ? t('common.done') : t('unifiedBox.p2pCancelButton')}
      </Button>
    </div>
  );
};

export default P2PActiveStage;
