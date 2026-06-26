import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useMultipartUpload, UploadProgressEvent } from '../../hooks/useMultipartUpload';
import { useP2PUploader } from '../../hooks/useP2PUploader';
import { pushSession } from '../../utils/recentSessions';
import { getRelativePathSafe, fileKey } from '../../utils/fileWithPath';
import { consumeEmptyFolders } from '../../utils/dropzoneFiles';
import { useUnifiedFileBoxState } from './useUnifiedFileBoxState';
import ModeHeader from './ModeHeader';
import IdleUpload from './IdleUpload';
import IdleDownload from './IdleDownload';
import Uploading, { UploadingItem } from './Uploading';
import UploadSuccess from './UploadSuccess';
import P2PWaiting from './P2PWaiting';
import P2PActiveStage from './P2PActiveStage';
import DownloadFilePage from '../../pages/DownloadFilePage';
import RecentShares from './RecentShares';
import RecentDownloads from './RecentDownloads';
import AnimatedHeight from './AnimatedHeight';
import { fileAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

const UnifiedFileBox: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, dispatch] = useUnifiedFileBoxState();
  const [items, setItems] = useState<UploadingItem[]>([]);
  const itemsRef = useRef<UploadingItem[]>([]);
  itemsRef.current = items;
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const handleRef = useRef<{ abort: () => void; cancelFile: (fileIndex: number) => void } | null>(null);
  const [downloadPrefill, setDownloadPrefill] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const prevStateRef = useRef(state.state);
  const idleReturnFromSuccess =
    state.state === 'idleUpload' && prevStateRef.current === 'success';
  useEffect(() => {
    prevStateRef.current = state.state;
  }, [state.state]);

  const uploader = useMultipartUpload({
    mode: 'public',
    onProgress: (events: UploadProgressEvent[]) => {
      setItems((prev) =>
        prev.map((it, i) => {
          const e = events[i];
          if (!e) return it;
          return { ...it, loadedBytes: e.loadedBytes };
        })
      );
    },
    onFileComplete: (idx) => {
      setItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, completed: true, loadedBytes: it.fileSize } : it))
      );
    },
  });

  const p2pEnabled =
    state.state === 'p2pWaiting' ||
    state.state === 'p2pConnected' ||
    state.state === 'p2pTransferring';
  const p2p = useP2PUploader({
    shareCode: state.p2pShareCode || '',
    files: state.files,
    enabled: p2pEnabled,
  });

  useEffect(() => {
    if (!p2pEnabled) return;
    dispatch({ type: 'p2pStatusChange', status: p2p.status });
  }, [p2p.status, p2pEnabled, dispatch]);

  useEffect(() => {
    const activeTransfer =
      state.state === 'uploading' ||
      state.state === 'p2pCreating' ||
      state.state === 'p2pWaiting' ||
      state.state === 'p2pConnected' ||
      state.state === 'p2pTransferring';
    if (!activeTransfer) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.state]);

  useEffect(() => {
    if (p2pEnabled && p2p.connectionFailed) {
      toast.error(t('unifiedBox.p2pConnectionFailed'));
      dispatch({ type: 'p2pFailed' });
    }
  }, [p2p.connectionFailed, p2pEnabled, dispatch, t]);

  const startNormalUploadPipeline = useCallback(
    (files: File[]) => {
      setItems(
        files.map((f, i) => ({
          id: `u-${Date.now()}-${i}`,
          fileName: f.name,
          fileSize: f.size,
          loadedBytes: 0,
          completed: false,
          file: f,
        }))
      );
      const handle = uploader.startUpload({ files });
      handleRef.current = handle;
      handle.promise
        .then((result) => {
          const session = {
            code: result.share_code,
            fileNames: result.fileNames,
            totalSize: result.totalSize,
            expiresAt: result.expires_at,
            createdAt: new Date().toISOString(),
          };
          pushSession(session);
          setRecentRefreshKey((k) => k + 1);
          dispatch({ type: 'completeAll', result: session });
          window.dispatchEvent(new Event('upload:complete'));
        })
        .catch((err: any) => {
          if (err?.name === 'CanceledError' || err?.message === 'Upload cancelled') return;
          toast.error(t('upload.uploadFailed'));
          dispatch({ type: 'failAll' });
        })
        .finally(() => {
          handleRef.current = null;
        });
    },
    [dispatch, uploader, t]
  );

  const createP2PSession = useCallback(
    async (files: File[], emptyFolders: string[]) => {
      try {
        const fileInfo = files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
          relative_path: getRelativePathSafe(f),
        }));
        const res = await fileAPI.createP2PSession(fileInfo, undefined, emptyFolders);
        const expiresAt =
          res.files[0]?.expires_at ||
          new Date(Date.now() + 30 * 60_000).toISOString();
        dispatch({
          type: 'p2pSessionCreated',
          shareCode: res.share_code,
          expiresAt,
        });
      } catch {
        toast.error(t('unifiedBox.p2pSessionFailed'));
        dispatch({ type: 'p2pFailed' });
      }
    },
    [dispatch, t]
  );

  const onNormal = useCallback(
    (files: File[]) => {
      const emptyFolders = consumeEmptyFolders();
      if (files.length === 0) {
        if (emptyFolders.length > 0) window.alert(t('upload.emptyFolderNotAllowed'));
        return;
      }
      handleRef.current?.abort();
      dispatch({ type: 'dropNormal', files });
      startNormalUploadPipeline(files);
    },
    [dispatch, startNormalUploadPipeline, t]
  );

  const onSecure = useCallback(
    (files: File[]) => {
      const emptyFolders = consumeEmptyFolders();
      if (files.length === 0) {
        // Nothing but empty folder(s) was dropped — reject the whole attach.
        if (emptyFolders.length > 0) window.alert(t('upload.emptyFolderNotAllowed'));
        return;
      }
      handleRef.current?.abort();
      dispatch({ type: 'dropSecure', files });
      // Files present: keep them AND preserve their empty subfolders.
      createP2PSession(files, emptyFolders);
    },
    [dispatch, createP2PSession, t]
  );

  const onCancelAllUpload = useCallback(() => {
    handleRef.current?.abort();
    handleRef.current = null;
    dispatch({ type: 'cancelUpload' });
    setItems([]);
    toast.info(t('upload.uploadCancelled'));
  }, [dispatch, t]);

  const onCancelUploadFile = useCallback((id: string) => {
    const cur = itemsRef.current;
    const idx = cur.findIndex((it) => it.id === id);
    if (idx < 0) return;
    handleRef.current?.cancelFile(idx);
    const allCanceled = cur.every((it, i) => i === idx || it.canceled);
    if (allCanceled) {
      handleRef.current?.abort();
      handleRef.current = null;
      dispatch({ type: 'cancelUpload' });
      setItems([]);
      toast.info(t('upload.uploadCancelled'));
      return;
    }
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, canceled: true } : it)));
  }, [dispatch, t]);

  const onP2PCancel = useCallback(() => {
    dispatch({ type: 'p2pCancel' });
  }, [dispatch]);

  const onDrillDown = () => {
    navigate('/upload', { state: { initialFiles: state.files, fromUnifiedBox: true } });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSlash = e.key === '/';
      const isDigit = /^[0-9]$/.test(e.key);
      if (!isSlash && !isDigit) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        state.state === 'uploading' ||
        state.state === 'p2pCreating' ||
        state.state === 'p2pWaiting' ||
        state.state === 'p2pConnected' ||
        state.state === 'p2pTransferring' ||
        state.state === 'downloadActive'
      ) {
        return;
      }
      e.preventDefault();
      if (state.mode !== 'download') {
        dispatch({ type: 'switchMode', mode: 'download' });
      }
      if (isDigit) {
        setDownloadPrefill(e.key);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.state, state.mode, dispatch]);

  const tabsDisabled =
    downloadBusy ||
    state.state === 'uploading' ||
    state.state === 'p2pCreating' ||
    state.state === 'p2pWaiting' ||
    state.state === 'p2pConnected' ||
    state.state === 'p2pTransferring';

  const showRecent =
    state.state === 'idleUpload' || state.state === 'idleDownload';

  return (
    <div className="bg-card rounded-2xl flex flex-col border-[3px] border-foreground/[0.09] overflow-hidden">
      <ModeHeader
        mode={state.mode}
        disabled={tabsDisabled}
        onSwitchMode={(m) => dispatch({ type: 'switchMode', mode: m })}
        onDrillDownToUpload={onDrillDown}
      />
      <AnimatedHeight transitionKey={`${state.mode}:${state.state}`}>
      <div
        className={cn(
          'border-t border-foreground/[0.09]',
          'min-h-[500px] md:min-h-[412px] flex flex-col'
        )}
        role="tabpanel"
      >
        {state.mode === 'upload' && state.state === 'idleUpload' && (
          <IdleUpload onNormal={onNormal} onSecure={onSecure} animateIn={idleReturnFromSuccess} />
        )}
        {state.mode === 'upload' && state.state === 'uploading' && (
          <Uploading items={items} onCancel={onCancelUploadFile} onCancelAll={onCancelAllUpload} />
        )}
        {state.mode === 'upload' && state.state === 'success' && state.lastResult && (
          <UploadSuccess
            result={state.lastResult}
            failedNames={state.uploadFailures}
            onConfirm={() => dispatch({ type: 'close' })}
            onRetry={() =>
              onNormal(state.files.filter((f) => state.uploadFailures.includes(f.name)))
            }
          />
        )}
        {state.mode === 'upload' &&
          (state.state === 'p2pCreating' || state.state === 'p2pWaiting') && (
            <P2PWaiting
              key={state.state === 'p2pCreating' || !state.p2pShareCode ? 'p2p-loading' : 'p2p-ready'}
              loading={state.state === 'p2pCreating' || !state.p2pShareCode}
              shareCode={state.p2pShareCode ?? undefined}
              fileCount={state.files.length}
              onCancel={onP2PCancel}
            />
          )}
        {state.mode === 'upload' &&
          (state.state === 'p2pConnected' ||
            state.state === 'p2pTransferring' ||
            state.state === 'p2pCompleted') && (
            <P2PActiveStage
              status={p2p.status}
              files={state.files}
              fileProgresses={p2p.fileProgresses}
              peerDeviceInfo={p2p.peerDeviceInfo}
              completed={state.state === 'p2pCompleted'}
              onCancel={onP2PCancel}
              onCancelFile={(key) => {
                const remaining = state.files.filter((f) => fileKey(f) !== key);
                if (remaining.length === 0) {
                  onP2PCancel();
                  return;
                }
                p2p.removeFile(key);
                dispatch({ type: 'p2pRemoveFile', fileName: key });
              }}
              onNew={() => dispatch({ type: 'p2pNewTransfer' })}
            />
          )}
        {state.mode === 'download' && state.state === 'idleDownload' && (
          <IdleDownload
            shortcutEnabled
            prefill={downloadPrefill}
            onPrefillConsumed={() => setDownloadPrefill(null)}
            onSubmit={(downloadCode) => dispatch({ type: 'enterDownload', code: downloadCode })}
          />
        )}
        {state.mode === 'download' && state.state === 'downloadActive' && state.downloadCode && (
          <DownloadFilePage
            embedded
            codeOverride={state.downloadCode}
            onReset={() => dispatch({ type: 'closeDownload' })}
            onComplete={() => dispatch({ type: 'switchMode', mode: 'upload' })}
            onBusyChange={setDownloadBusy}
          />
        )}
      </div>
      </AnimatedHeight>
      {showRecent && (
        <div className="border-t border-foreground/[0.09]">
          {state.mode === 'download' ? (
            <RecentDownloads />
          ) : (
            <RecentShares refreshKey={recentRefreshKey} />
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedFileBox;
