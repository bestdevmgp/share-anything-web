import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { useMultipartUpload, UploadProgressEvent } from '../../hooks/useMultipartUpload';
import { useP2PUploader } from '../../hooks/useP2PUploader';
import { pushSession } from '../../utils/recentSessions';
import { useUnifiedFileBoxState } from './useUnifiedFileBoxState';
import ModeHeader from './ModeHeader';
import IdleUpload from './IdleUpload';
import IdleDownload from './IdleDownload';
import Uploading, { UploadingItem } from './Uploading';
import UploadSuccess from './UploadSuccess';
import P2PWaiting from './P2PWaiting';
import P2PTransferring from './P2PTransferring';
import P2PCompleted from './P2PCompleted';
import { fileAPI } from '../../services/api';
import { toast } from '../../context/ToastContext';
import { Spinner } from '../ui/spinner';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

const UnifiedFileBox: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [state, dispatch] = useUnifiedFileBoxState();
  const [items, setItems] = useState<UploadingItem[]>([]);
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  const handleRef = useRef<{ abort: () => void } | null>(null);
  const [downloadPrefill, setDownloadPrefill] = useState<string | null>(null);

  const uploader = useMultipartUpload({
    mode: isAuthenticated ? 'quick-access' : 'public',
    onProgress: (events: UploadProgressEvent[]) => {
      setItems((prev) =>
        prev.map((it, i) => {
          const e = events[i];
          if (!e) return it;
          return { ...it, progress: e.percent };
        })
      );
    },
    onFileComplete: (idx) => {
      setItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, completed: true, progress: 100 } : it))
      );
    },
  });

  const p2pEnabled =
    state.state === 'p2pWaiting' || state.state === 'p2pTransferring';
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
          progress: 0,
          timeRemaining: '',
          completed: false,
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
    async (files: File[]) => {
      try {
        const fileInfo = files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
        }));
        const res = await fileAPI.createP2PSession(fileInfo);
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
      if (files.length === 0) return;
      handleRef.current?.abort();
      dispatch({ type: 'dropNormal', files });
      startNormalUploadPipeline(files);
    },
    [dispatch, startNormalUploadPipeline]
  );

  const onSecure = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      handleRef.current?.abort();
      dispatch({ type: 'dropSecure', files });
      createP2PSession(files);
    },
    [dispatch, createP2PSession]
  );

  const onCancelItem = (_id: string) => {
    handleRef.current?.abort();
    dispatch({ type: 'cancelUpload' });
    setItems([]);
  };

  const onP2PCancel = useCallback(() => {
    dispatch({ type: 'p2pCancel' });
  }, [dispatch]);

  const onDrillDown = () => {
    navigate('/upload', { state: { initialFiles: state.files, fromUnifiedBox: true } });
  };

  // Global shortcuts: "/" or a digit key jumps to the download tab. A digit
  // key additionally pre-fills the first OTP cell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSlash = e.key === '/';
      const isDigit = /^[0-9]$/.test(e.key);
      if (!isSlash && !isDigit) return;
      // Don't hijack typing in any input/textarea anywhere on the page
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Don't trigger when modifiers are held (browser shortcuts)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't trigger while any upload activity is in progress
      if (
        state.state === 'uploading' ||
        state.state === 'p2pCreating' ||
        state.state === 'p2pWaiting' ||
        state.state === 'p2pTransferring'
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
    state.state === 'uploading' ||
    state.state === 'p2pCreating' ||
    state.state === 'p2pWaiting' ||
    state.state === 'p2pTransferring';

  return (
    <div className="bg-card rounded-2xl flex flex-col">
      <div className="border-t-[3px] border-x-[3px] border-foreground/[0.09] rounded-t-2xl">
        <ModeHeader
          mode={state.mode}
          disabled={tabsDisabled}
          onSwitchMode={(m) => dispatch({ type: 'switchMode', mode: m })}
          onDrillDownToUpload={onDrillDown}
        />
      </div>
      <div
        className={cn(
          'border-t-[3px] border-x-[3px] border-b-[3px] rounded-b-2xl',
          // border-box: min-h includes the 6px border, so it is 6px larger than the
          // inner views' min-h (420/412) to keep every tab at the same outer height.
          'min-h-[426px] md:min-h-[418px] flex flex-col',
          'border-foreground/[0.09]'
        )}
        role="tabpanel"
      >
        {state.mode === 'upload' && state.state === 'idleUpload' && (
          <IdleUpload
            onNormal={onNormal}
            onSecure={onSecure}
            recentRefreshKey={recentRefreshKey}
          />
        )}
        {state.mode === 'upload' && state.state === 'uploading' && (
          <Uploading items={items} onCancel={onCancelItem} />
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
        {state.mode === 'upload' && state.state === 'p2pCreating' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
            <LockClosedIcon className="w-12 h-12 text-primary mb-3" strokeWidth={2.5} />
            <Spinner size="sm" className="text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('unifiedBox.p2pWaitingTitle')}…
            </p>
          </div>
        )}
        {state.mode === 'upload' && state.state === 'p2pWaiting' && state.p2pShareCode && (
          <P2PWaiting
            shareCode={state.p2pShareCode}
            fileCount={state.files.length}
            onCancel={onP2PCancel}
          />
        )}
        {state.mode === 'upload' && state.state === 'p2pTransferring' && (
          <P2PTransferring
            files={state.files}
            fileProgresses={p2p.fileProgresses}
            peerDeviceInfo={p2p.peerDeviceInfo}
            onCancel={onP2PCancel}
          />
        )}
        {state.mode === 'upload' && state.state === 'p2pCompleted' && (
          <P2PCompleted
            fileCount={state.files.length}
            peerDeviceInfo={p2p.peerDeviceInfo}
            onNew={() => dispatch({ type: 'p2pNewTransfer' })}
          />
        )}
        {state.mode === 'download' && (
          <IdleDownload
            shortcutEnabled
            prefill={downloadPrefill}
            onPrefillConsumed={() => setDownloadPrefill(null)}
          />
        )}
      </div>
    </div>
  );
};

export default UnifiedFileBox;
