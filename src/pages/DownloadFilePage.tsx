import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileAPI } from '../services/api';
import { FileListResponse } from '../types';
import { downloadFile, isPptxFile, formatTimeRemaining, calculateTimeRemaining, getDeviceInfo, isImageFile, formatFileSize } from '../utils/format';
import TruncatedFilename from '../components/TruncatedFilename';
import { XMarkIcon, ArrowDownTrayIcon, FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import PauseBarsIcon from '../components/PauseBarsIcon';
import { toast } from '../context/ToastContext';
import { useTranslation, translateApiError } from '../i18n';
import { useP2PDownloader } from '../hooks/useP2PDownloader';
import { createWebSocketConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import FilePreviewModal from '../components/FilePreviewModal';
import { useThumbnail } from '../hooks/useThumbnail';
import { useBundlePreviews } from '../components/UnifiedFileBox/useSharePreviews';
import { pushDownload } from '../utils/recentDownloads';
import {
  createStructuredZip,
  createZipFromBlobs,
  streamBlobsToDiskZip,
  canStreamToDisk,
  ZipFetchError,
  ZipFileSpec,
} from '../utils/structuredZip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Hint } from '../components/ui/Hint';

import { Spinner } from '../components/ui/spinner';
import { cn } from 'lib/utils';

import DownloadErrorState from './download/DownloadErrorState';
import PasswordForm from './download/PasswordForm';
import SingleFileView from './download/SingleFileView';
import MultiFileList from './download/MultiFileList';
import { buildFileTree, collectFileIds, nodeFileCount, nodeSize, toggleFolderOpen, TreeFolder, TreeFile } from '../utils/fileTree';
import FolderTreeRows, { treeIndent } from '../components/UnifiedFileBox/FolderTreeRows';
import Collapsible from '../components/UnifiedFileBox/Collapsible';
import FileThumbnail from '../components/FileThumbnail';
import BoxDownloadView from '../components/UnifiedFileBox/BoxDownloadView';

interface DownloadFilePageProps {
  embedded?: boolean;
  codeOverride?: string;
  onReset?: () => void;
  onComplete?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

// Desktop = mouse + large screen. Drives both the bulk-save gap and the in-memory-zip
// size guard (desktops have far more RAM, and only desktop Chromium can stream to disk).
const IS_PC =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: fine)').matches &&
  window.matchMedia('(min-width: 1024px)').matches;

// Gap between consecutive bulk-download saves so browsers don't drop rapid downloads.
// Desktop is reliable with the delayed revokeObjectURL alone, so no gap; touch devices
// (incl. iPad) need spacing because of the one-download-per-gesture limit.
const BULK_SAVE_GAP_MS = IS_PC ? 0 : 3000;

// When a ZIP must be built in memory (no File System Access streaming), warn past this
// total size — building holds every file in RAM at once, which crashes low-memory devices.
const IN_MEMORY_ZIP_WARN_BYTES = IS_PC ? 4_000_000_000 : 1_000_000_000;

const DownloadFilePage: React.FC<DownloadFilePageProps> = ({ embedded, codeOverride, onReset, onComplete, onBusyChange }) => {
  const { code: codeParam } = useParams<{ code: string }>();
  const code = codeOverride ?? codeParam;
  const { t, language } = useTranslation();

  useEffect(() => {
    if (!embedded) document.title = t('download.pageTitle');
  }, [t, embedded]);
  const navigate = useNavigate();

  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorTitleKey, setErrorTitleKey] = useState('');
  const [errorDescKey, setErrorDescKey] = useState('');
  const [errorDescFallback, setErrorDescFallback] = useState('');

  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTimeRemaining, setDownloadTimeRemaining] = useState<string>('');
  const [downloadAbortController, setDownloadAbortController] = useState<AbortController | null>(null);
  const [downloadAsZip, setDownloadAsZip] = useState(false);
  const lastDownloadTimeUpdateRef = useRef<number>(0);

  const [zipping, setZipping] = useState(false);
  const [zipDone, setZipDone] = useState(0);
  const [zipTotal, setZipTotal] = useState(0);
  const [zipError, setZipError] = useState(false);
  const zipAbortRef = useRef<AbortController | null>(null);

  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileSize: number; source?: string; code?: string; fileId?: string; password?: string; presignedUrl?: string } | null>(null);
  const [singleFilePreviewUrl, setSingleFilePreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [isP2PDownload, setIsP2PDownload] = useState(false);
  const [p2pEnabled, setP2pEnabled] = useState(false);
  const [p2pActiveFileId, setP2pActiveFileId] = useState<string | null>(null);
  const [p2pCompletedFileIds, setP2pCompletedFileIds] = useState<Set<string>>(new Set());
  // Sender ended the session while files remain — show a partial-success screen instead of bailing.
  const [senderEnded, setSenderEnded] = useState(false);
  const [openP2PFolders, setOpenP2PFolders] = useState<Set<string>>(new Set());
  const toggleP2PFolder = (path: string) => setOpenP2PFolders((prev) => toggleFolderOpen(prev, path));

  const [bulkP2PDownloading, setBulkP2PDownloading] = useState(false);
  const [bulkRemaining, setBulkRemaining] = useState(0);
  const bulkQueueRef = useRef<string[]>([]);
  const bulkTotalRef = useRef<number>(0);
  const bulkBlobsRef = useRef<{ entryName: string; blob: Blob }[]>([]);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Current bulk job: 'zip' accumulates blobs into one named zip (folder / download-all);
  // 'individual' saves each file flat (loose files / all-flat download-all).
  const bulkJobRef = useRef<{ mode: 'zip' | 'individual'; zipName: string; emptyFolders: string[] }>({
    mode: 'individual',
    zipName: '',
    emptyFolders: [],
  });

  // Streaming-zip-to-disk bridge: in this mode each received file is handed straight to the
  // on-disk zip (resolving the pending per-file promise) instead of being kept in memory.
  const streamingRef = useRef(false);
  const streamResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const streamRejectRef = useRef<((err: unknown) => void) | null>(null);

  const recordDownloadRef = useRef<() => void>(() => {});
  recordDownloadRef.current = () => {
    if (!code || !fileList || fileList.files.length === 0) return;
    if (isP2PDownload) return;
    pushDownload({
      code,
      fileNames: fileList.files.map((f) => f.file_name),
      totalSize: fileList.files.reduce((sum, f) => sum + f.file_size, 0),
      expiresAt: fileList.expires_at,
      downloadedAt: new Date().toISOString(),
      firstFileId: fileList.files[0].id,
    });
  };

  const handleP2PDownloadComplete = useCallback((blob: Blob, fileName: string) => {
    const completedId = p2pActiveFileId || '';
    const completedFile = fileList?.files.find((f) => f.id === completedId);
    const job = bulkJobRef.current;
    const zipMode = bulkP2PDownloading && job.mode === 'zip';

    if (zipMode) {
      bulkBlobsRef.current.push({
        entryName: completedFile?.relative_path || completedFile?.file_name || fileName,
        blob,
      });
    } else {
      downloadFile(blob, fileName);
    }
    setP2pCompletedFileIds(prev => new Set(prev).add(completedId));
    recordDownloadRef.current();

    if (bulkP2PDownloading) {
      bulkQueueRef.current = bulkQueueRef.current.filter(id => id !== completedId);
      setBulkRemaining(bulkQueueRef.current.length);
      const nextId = bulkQueueRef.current[0];
      if (nextId) {
        if (zipMode) {
          setP2pActiveFileId(nextId);
        } else {
          // Space out individual saves so the browser doesn't drop rapid downloads.
          advanceTimerRef.current = setTimeout(() => setP2pActiveFileId(nextId), BULK_SAVE_GAP_MS);
        }
      } else {
        setBulkP2PDownloading(false);
        bulkTotalRef.current = 0;
        if (zipMode) {
          const collected = bulkBlobsRef.current;
          bulkBlobsRef.current = [];
          createZipFromBlobs(collected, job.zipName, job.emptyFolders)
            .then(() => toast.success(t('download.zipDownloadComplete')))
            .catch(() => toast.error(t('download.downloadFailed')));
        } else {
          toast.success(t('download.downloadComplete'));
        }
      }
      return;
    }

    toast.success(t('download.downloadComplete'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pActiveFileId, bulkP2PDownloading, fileList, code, t]);

  const singleFile = fileList?.files?.length === 1 ? fileList.files[0] : null;
  const singleFileThumbnail = useThumbnail(
    singleFile && singleFilePreviewUrl && !isImageFile(singleFile.file_name) ? singleFilePreviewUrl : null,
    singleFile?.file_name || '',
    600
  );
  const filePreviews = useBundlePreviews(
    code ?? null,
    fileList ? fileList.files.map((f) => ({ id: f.id, name: f.file_name })) : undefined,
    (fileList?.has_password ?? false) || isP2PDownload
  );
  const p2pActiveFile = p2pActiveFileId ? fileList?.files?.find(f => f.id === p2pActiveFileId) : singleFile;

  const { status: p2pStatus, progress: p2pProgress, timeRemaining: p2pTimeRemaining, peerDeviceInfo: p2pPeerDeviceInfo, cancelDownload, close: closeP2PSession } = useP2PDownloader({
    shareCode: code || '',
    password: password || undefined,
    fileInfo: p2pActiveFile ? {
      share_code: code || '',
      file_name: p2pActiveFile.file_name,
      file_size: p2pActiveFile.file_size,
      file_type: p2pActiveFile.file_type,
      relative_path: p2pActiveFile.relative_path,
      transfer_type: fileList?.transfer_type || 'server',
      has_password: fileList?.has_password || false,
      expires_at: fileList?.expires_at || '',
      uploader_online: fileList?.uploader_online ?? null
    } : {
      share_code: '',
      file_name: '',
      file_size: 0,
      file_type: '',
      transfer_type: 'server',
      has_password: false,
      expires_at: '',
      uploader_online: null
    },
    enabled: p2pEnabled && !!p2pActiveFile,
    onComplete: (blob) => {
      // Streaming mode: hand the file to the on-disk zip via the pending promise.
      if (streamingRef.current && streamResolveRef.current) {
        const resolve = streamResolveRef.current;
        streamResolveRef.current = null;
        streamRejectRef.current = null;
        setP2pCompletedFileIds((prev) => new Set(prev).add(p2pActiveFileId || ''));
        recordDownloadRef.current();
        resolve(blob);
        return;
      }
      handleP2PDownloadComplete(blob, p2pActiveFile?.file_name || 'file');
    },
    onPeerFileRemoved: (removedKey) => {
      const removed = fileList?.files.find((f) => (f.relative_path || f.file_name) === removedKey);
      const activeFile = p2pActiveFileId ? fileList?.files.find((f) => f.id === p2pActiveFileId) : null;
      const activeRemoved = !!activeFile && (activeFile.relative_path || activeFile.file_name) === removedKey;
      setFileList((prev) => {
        if (!prev) return prev;
        const files = prev.files.filter((f) => (f.relative_path || f.file_name) !== removedKey);
        return { ...prev, files, total_count: files.length };
      });
      if (removed && bulkQueueRef.current.includes(removed.id)) {
        bulkQueueRef.current = bulkQueueRef.current.filter((id) => id !== removed.id);
        setBulkRemaining(bulkQueueRef.current.length);
      }
      if (activeRemoved) {
        // The sender removed the file currently being received → it would otherwise hang on
        // "receiving…". Warn the receiver and end the session.
        toast.warning(t('p2p.senderCancelledTransfer'));
        if (embedded) onReset?.();
        else navigate('/');
      }
    },
    onSenderDisconnected: () => {
      // Sender ended the session. If everything was already received the success screen is showing.
      // If ≥1 file made it, keep the receiver on a partial-success screen; if nothing arrived, warn and leave.
      const total = fileList?.files.length ?? 0;
      const received = fileList ? fileList.files.filter((f) => p2pCompletedFileIds.has(f.id)).length : 0;
      if (total > 0 && received === total) return;
      toast.warning(t('p2p.senderDisconnected'));
      if (received >= 1) {
        setSenderEnded(true);
        return;
      }
      if (embedded) onReset?.();
      else navigate('/');
    }
  });

  const downloadBusy =
    downloading ||
    bulkP2PDownloading ||
    (isP2PDownload && (p2pStatus === 'connecting' || p2pStatus === 'downloading' || p2pStatus === 'processing'));

  useEffect(() => {
    onBusyChange?.(downloadBusy);
  }, [downloadBusy, onBusyChange]);

  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);

  const startP2PDownload = useCallback((fileId: string) => {
    setP2pActiveFileId(fileId);
    setP2pEnabled(true);
  }, []);

  const handleCancelP2PDownload = useCallback(() => {
    cancelDownload();
    setP2pActiveFileId(null);
    setP2pEnabled(false);
    if (bulkP2PDownloading) {
      bulkQueueRef.current = [];
      bulkTotalRef.current = 0;
      bulkBlobsRef.current = [];
      setBulkRemaining(0);
      setBulkP2PDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelDownload, bulkP2PDownloading]);

  // Receive one P2P file and resolve with its blob (used by the streaming-zip generator).
  const receiveOneFile = useCallback(
    (fileId: string) =>
      new Promise<Blob>((resolve, reject) => {
        streamResolveRef.current = resolve;
        streamRejectRef.current = reject;
        setP2pActiveFileId(fileId);
        setP2pEnabled(true);
      }),
    []
  );

  // Stream a structured ZIP straight to disk: receive each file, hand it to the on-disk zip,
  // release it, then fetch the next. Peak memory stays at ~one file (handles 50GB+ folders).
  const runStreamingZip = useCallback(
    async (ids: string[], zipName: string, emptyFolders: string[]) => {
      if (!fileList) return;
      streamingRef.current = true;
      bulkTotalRef.current = ids.length;
      setBulkRemaining(ids.length);
      setBulkP2PDownloading(true);
      let remaining = ids.length;
      const filesIter = (async function* () {
        for (const id of ids) {
          const file = fileList.files.find((f) => f.id === id);
          const blob = await receiveOneFile(id);
          remaining -= 1;
          setBulkRemaining(remaining);
          yield { name: file?.relative_path || file?.file_name || 'file', blob };
        }
      })();
      try {
        const ok = await streamBlobsToDiskZip({ files: filesIter, suggestedName: zipName, emptyFolders });
        if (ok) toast.success(t('download.zipDownloadComplete'));
      } catch {
        toast.error(t('download.downloadFailed'));
      } finally {
        streamingRef.current = false;
        streamResolveRef.current = null;
        streamRejectRef.current = null;
        setP2pActiveFileId(null);
        setP2pEnabled(false);
        setBulkP2PDownloading(false);
        bulkTotalRef.current = 0;
        setBulkRemaining(0);
      }
    },
    [fileList, receiveOneFile, t]
  );

  // Build a structured ZIP for the given file ids: stream to disk where supported (desktop
  // Chromium), else build in memory — warning first when the total would strain low RAM.
  const startZipDownload = useCallback(
    (ids: string[], zipName: string, emptyFolders: string[]) => {
      if (!fileList || ids.length === 0) return;
      if (canStreamToDisk()) {
        runStreamingZip(ids, zipName, emptyFolders);
        return;
      }
      const totalBytes = fileList.files
        .filter((f) => ids.includes(f.id))
        .reduce((sum, f) => sum + f.file_size, 0);
      if (totalBytes > IN_MEMORY_ZIP_WARN_BYTES && !window.confirm(t('download.largeZipConfirm'))) return;
      bulkJobRef.current = { mode: 'zip', zipName, emptyFolders };
      bulkQueueRef.current = [...ids];
      bulkTotalRef.current = ids.length;
      bulkBlobsRef.current = [];
      setBulkRemaining(ids.length);
      setBulkP2PDownloading(true);
      setP2pActiveFileId(ids[0]);
      setP2pEnabled(true);
    },
    [fileList, runStreamingZip, t]
  );

  const startBulkP2PDownload = useCallback(() => {
    if (!fileList) return;
    const ids = fileList.files.filter(f => !p2pCompletedFileIds.has(f.id)).map(f => f.id);
    if (ids.length === 0) return;
    const hasFolders =
      fileList.files.some(f => (f.relative_path || '').includes('/')) ||
      (fileList.empty_folders?.length ?? 0) > 0;
    if (hasFolders) {
      startZipDownload(ids, `share-${code}.zip`, fileList.empty_folders ?? []);
      return;
    }
    // All-loose files: keep individual saves (memory-light; lets the user pick per file).
    bulkJobRef.current = { mode: 'individual', zipName: `share-${code}.zip`, emptyFolders: [] };
    bulkQueueRef.current = [...ids];
    bulkTotalRef.current = ids.length;
    bulkBlobsRef.current = [];
    setBulkRemaining(ids.length);
    setBulkP2PDownloading(true);
    setP2pActiveFileId(ids[0]);
    setP2pEnabled(true);
  }, [fileList, p2pCompletedFileIds, code, startZipDownload]);

  // Download one top-level folder as a single structured zip (its files + its empty subfolders).
  const downloadFolderAsZip = useCallback((folderPath: string) => {
    if (!fileList) return;
    const prefix = folderPath + '/';
    const ids = fileList.files
      .filter(f => (f.relative_path || '').startsWith(prefix))
      .filter(f => !p2pCompletedFileIds.has(f.id))
      .map(f => f.id);
    const folderEmpties = (fileList.empty_folders ?? []).filter(
      ef => ef === folderPath || ef.startsWith(prefix)
    );
    const folderName = folderPath.split('/').pop() || folderPath;
    const zipName = `${folderName}.zip`;
    if (ids.length === 0) {
      // Entirely empty folder (no files): zip just its structure.
      if (folderEmpties.length > 0) {
        createZipFromBlobs([], zipName, folderEmpties)
          .then(() => toast.success(t('download.zipDownloadComplete')))
          .catch(() => toast.error(t('download.downloadFailed')));
      }
      return;
    }
    startZipDownload(ids, zipName, folderEmpties);
  }, [fileList, p2pCompletedFileIds, t, startZipDownload]);

  useEffect(() => {
    if (p2pStatus === 'error' || p2pStatus === 'cancelled') {
      // Abort an in-flight streaming zip: rejecting tears down the zip stream + disk writable.
      if (streamRejectRef.current) {
        const reject = streamRejectRef.current;
        streamResolveRef.current = null;
        streamRejectRef.current = null;
        reject(new DOMException('Transfer failed', 'AbortError'));
      }
      if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
      setP2pActiveFileId(null);
      setP2pEnabled(false);
      if (bulkP2PDownloading) {
        bulkQueueRef.current = [];
        bulkTotalRef.current = 0;
        setBulkRemaining(0);
        setBulkP2PDownloading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pStatus]);

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isP2PDownload || !fileList || !passwordVerified || !code) return;

    let ws: WebSocket | null = null;
    let keepalive: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reannounceTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const peerId = generatePeerId();

    const announce = (sock: WebSocket) => {
      sendSignalingMessage(sock, {
        type: 'downloader_arrived',
        share_code: code,
        peer_id: peerId,
        device_info: getDeviceInfo()
      });
    };

    const connect = () => {
      if (closed) return;
      const sock = createWebSocketConnection(() => {});
      ws = sock;

      sock.onopen = () => {
        if (closed) return;
        announce(sock);
        reannounceTimer = setTimeout(() => {
          if (!closed && sock.readyState === WebSocket.OPEN) announce(sock);
        }, 1500);
      };

      sock.onclose = () => {
        if (closed) return;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    keepalive = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        sendSignalingMessage(ws, { type: 'ping' });
      }
    }, 25000);

    return () => {
      closed = true;
      if (keepalive) clearInterval(keepalive);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (reannounceTimer) clearTimeout(reannounceTimer);
      if (ws) ws.close();
    };
  }, [isP2PDownload, fileList, passwordVerified, code]);

  const loadFileList = useCallback(async () => {
    if (!code) {
      if (!embedded) navigate('/');
      return;
    }

    try {
      setLoading(true);
      const list = await fileAPI.getFileList(code);
      setFileList(list);

      if (list.transfer_type === 'p2p') {
        setIsP2PDownload(true);

        if (list.uploader_online === false) {
          setErrorTitleKey('download.senderOffline');
          setErrorDescKey('download.senderOfflineDesc');
          return;
        }
      }

      if (!list.has_password) {
        setPasswordVerified(true);
        if (list.files.length === 1) {
          setSelectedFiles(new Set([list.files[0].id]));
        }
      }
    } catch (err: any) {
      const statusCode = err.response?.status;

      if (statusCode === 404) {
        setErrorTitleKey('download.invalidCode');
        setErrorDescKey('download.notFoundOrExpired');
      } else if (statusCode === 429) {
        setErrorTitleKey('download.blockedIP');
        setErrorDescKey('download.blockedIPDesc');
      } else {
        setErrorTitleKey('download.unknownError');
        if (err.response?.data) {
          setErrorDescFallback(translateApiError(err.response.data, t));
        } else {
          setErrorDescKey('download.tryAgainLater');
        }
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, navigate]);

  const onRetry = useCallback(() => {
    if (errorTitleKey === 'download.invalidCode') {
      if (embedded) onReset?.();
      else navigate('/');
      return;
    }
    setErrorTitleKey('');
    setErrorDescKey('');
    setErrorDescFallback('');
    loadFileList();
  }, [errorTitleKey, embedded, onReset, navigate, loadFileList]);

  useEffect(() => {
    loadFileList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fileList) return;
    const selectedTotalSize = fileList.files
      .filter(f => selectedFiles.has(f.id))
      .reduce((sum, f) => sum + f.file_size, 0);
    const ZIP_SIZE_LIMIT = 500 * 1024 * 1024;

    if (selectedTotalSize >= ZIP_SIZE_LIMIT) {
      setDownloadAsZip(false);
    }
  }, [selectedFiles, fileList]);

  useEffect(() => {
    let blobUrl: string | null = null;

    const loadFilePreview = async () => {
      if (!fileList || !code || fileList.files.length !== 1 || isP2PDownload || embedded) return;

      const file = fileList.files[0];

      try {
        setLoadingPreview(true);
        const blob = await fileAPI.previewFile(code, file.id, password || undefined);
        const url = URL.createObjectURL(blob);
        blobUrl = url;
        setSingleFilePreviewUrl(url);
      } catch (err) {
        console.error('Failed to load preview:', err);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadFilePreview();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileList, code, password, isP2PDownload, embedded]);

  const closePreview = () => setPreviewFile(null);

  const openPreview = async (
    fileName: string,
    fileSize: number,
    fileId: string,
    opts: { previewUrl?: string; preloadedSource?: string } = {}
  ) => {
    if (!code) return;
    const { previewUrl, preloadedSource } = opts;
    if (isPptxFile(fileName)) {
      try {
        const url = previewUrl || (await fileAPI.getDownloadUrl(code, fileId, password || undefined, true)).download_url;
        setPreviewFile({ fileName, fileSize, source: url, presignedUrl: url });
      } catch {
        toast.error(t('download.downloadFailed'));
      }
      return;
    }
    if (preloadedSource) {
      setPreviewFile({ fileName, fileSize, source: preloadedSource });
      return;
    }
    setPreviewFile({ fileName, fileSize, code, fileId, password: password || undefined, source: previewUrl || undefined });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !password) {
      toast.error(t('download.enterPassword'));
      return;
    }

    try {
      setLoading(true);

      await fileAPI.verifyPassword(code, password);

      setPasswordVerified(true);
      toast.success(t('download.passwordVerified'));

      if (fileList && fileList.files.length === 1) {
        setSelectedFiles(new Set([fileList.files[0].id]));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error(t('download.passwordIncorrect'));
        setPassword('');
        setShowPassword(false);
      } else {
        toast.error(t('download.passwordVerifyFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (asZip: boolean = false) => {
    if (!code || !fileList || selectedFiles.size === 0) return;

    const abortController = new AbortController();
    setDownloadAbortController(abortController);
    const downloadStartTime = Date.now();
    setDownloadAsZip(asZip);

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setDownloadTimeRemaining('');
      const selectedFileIds = Array.from(selectedFiles);

      if (asZip && selectedFileIds.length > 1) {
        const totalSize = fileList.files
          .filter(f => selectedFiles.has(f.id))
          .reduce((sum, f) => sum + f.file_size, 0);

        const blob = await fileAPI.downloadBulk(
          {
            code,
            file_ids: selectedFileIds,
            password: password || undefined
          },
          (progressEvent) => {
            setDownloadProgress(progressEvent.percentage);
            const now = Date.now();
            if (now - lastDownloadTimeUpdateRef.current >= 1000) {
              const remainingSeconds = calculateTimeRemaining(
                downloadStartTime,
                progressEvent.loaded,
                totalSize
              );
              setDownloadTimeRemaining(formatTimeRemaining(remainingSeconds, language));
              lastDownloadTimeUpdateRef.current = now;
            }
          },
          abortController.signal
        );

        downloadFile(blob, `share-${code}.zip`);
        recordDownloadRef.current();
        setDownloaded(true);
        toast.success(t('download.zipDownloadComplete'));
        return;
      }

      // Folders can't keep their paths on individual <a download> saves, so each top-level folder
      // is zipped (structure preserved) while loose files download one by one. The ZIP button packs
      // everything into one structured zip instead; this button keeps folders separate.
      const selected = fileList.files.filter((f) => selectedFiles.has(f.id));
      const allEmpties = fileList.empty_folders ?? [];
      const selTree = buildFileTree(selected, []);
      const topFolders = selTree.filter((n): n is TreeFolder => n.kind === 'folder');
      const looseNodes = selTree.filter((n): n is TreeFile => n.kind === 'file');

      const getUrl = async (fileId: string) =>
        (await fileAPI.getDownloadUrl(code, fileId, password || undefined, undefined, undefined, true)).download_url;

      const saveLoose = async (node: TreeFile) => {
        const url = await getUrl(node.id);
        const link = document.createElement('a');
        link.href = url;
        link.download = node.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      const zipFolder = (folder: TreeFolder, preferFallback: boolean) => {
        const specs: ZipFileSpec[] = collectFileIds(folder).map((id) => {
          const f = fileList.files.find((x) => x.id === id)!;
          return { id: f.id, fileName: f.file_name, entryName: f.relative_path || f.file_name, size: f.file_size };
        });
        const folderEmpties = allEmpties.filter((ef) => ef === folder.path || ef.startsWith(folder.path + '/'));
        return createStructuredZip({
          specs,
          getDownloadUrl: getUrl,
          suggestedName: `${folder.name}.zip`,
          emptyFolders: folderEmpties,
          preferFallback,
        });
      };

      if (topFolders.length === 0) {
        // All loose files → individual saves, spaced so browsers don't drop rapid downloads.
        for (let i = 0; i < looseNodes.length; i++) {
          await saveLoose(looseNodes[i]);
          setDownloadProgress(Math.round(((i + 1) / looseNodes.length) * 100));
          if (i < looseNodes.length - 1) await new Promise((r) => setTimeout(r, 1000));
        }
      } else if (topFolders.length === 1 && looseNodes.length === 0) {
        // Exactly one folder → a single structured zip, streamed to disk when supported
        // (so a very large folder doesn't have to fit in memory). Same as the ZIP button.
        const ok = await zipFolder(topFolders[0], false);
        if (ok === false) return;
      } else {
        // Multiple folders / folders + loose files → one in-memory zip per folder (auto-downloads,
        // no save dialog, so several can run back to back) plus each loose file, all spaced.
        const tasks: (() => Promise<unknown>)[] = [
          ...topFolders.map((folder) => () => zipFolder(folder, true)),
          ...looseNodes.map((node) => () => saveLoose(node)),
        ];
        for (let i = 0; i < tasks.length; i++) {
          await tasks[i]();
          setDownloadProgress(Math.round(((i + 1) / tasks.length) * 100));
          if (i < tasks.length - 1) await new Promise((r) => setTimeout(r, BULK_SAVE_GAP_MS));
        }
      }

      fileAPI.notifyDownload(code, selectedFileIds);
      recordDownloadRef.current();
      setDownloaded(true);
      toast.success(
        selectedFileIds.length === 1
          ? t('download.downloadStarted')
          : t('download.multiDownloadStarted', { count: selectedFileIds.length })
      );
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        toast.info(t('download.downloadCancelled'));
      } else if (err.response?.status === 401) {
        toast.error(t('download.passwordIncorrect'));
        setPasswordVerified(false);
      } else {
        toast.error(translateApiError(err.response?.data, t) || t('download.downloadFailed'));
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setDownloadTimeRemaining('');
      setDownloadAbortController(null);
    }
  };

  const handleCancelDownload = () => {
    if (downloadAbortController) {
      downloadAbortController.abort();
    }
  };

  const handleStructuredZip = useCallback(
    async (forceFallback = false) => {
      if (!code || !fileList || selectedFiles.size === 0) return;

      const selected = fileList.files.filter((f) => selectedFiles.has(f.id));
      const specs: ZipFileSpec[] = selected.map((f) => {
        const rel = (f.relative_path || '').trim();
        return {
          id: f.id,
          fileName: f.file_name,
          entryName: rel || f.file_name,
          size: f.file_size,
        };
      });

      const abort = new AbortController();
      zipAbortRef.current = abort;

      setZipping(true);
      setZipError(false);
      setZipDone(0);
      setZipTotal(specs.length);

      try {
        const saved = await createStructuredZip({
          specs,
          emptyFolders: fileList.empty_folders,
          suggestedName: `share-${code}.zip`,
          getDownloadUrl: async (fileId) => {
            const { download_url } = await fileAPI.getDownloadUrl(code, fileId, password || undefined, undefined, undefined, true);
            return download_url;
          },
          onProgress: (p) => {
            setZipDone(p.done);
            setZipTotal(p.total);
          },
          signal: abort.signal,
          preferFallback: forceFallback,
        });

        if (saved) {
          recordDownloadRef.current();
          fileAPI.notifyDownload(code, selected.map((f) => f.id));
          setDownloaded(true);
          toast.success(t('download.zipDownloadComplete'));
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || abort.signal.aborted) {
          toast.info(t('download.downloadCancelled'));
        } else if (err instanceof ZipFetchError) {
          setZipError(true);
          toast.error(t('download.zipDownloadFailed'));
        } else {
          toast.error(translateApiError(err?.response?.data, t) || t('download.zipDownloadFailed'));
        }
      } finally {
        setZipping(false);
        zipAbortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, fileList, selectedFiles, password, t]
  );

  const handleCancelZip = useCallback(() => {
    zipAbortRef.current?.abort();
  }, []);

  const handleZipFallbackToIndividual = useCallback(() => {
    setZipError(false);
    handleDownload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set((fileList?.files ?? []).map(f => f.id)));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const setFilesSelected = (fileIds: string[], selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) fileIds.forEach(id => newSet.add(id));
      else fileIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  useEffect(() => {
    if (fileList && passwordVerified) {
      setSelectedFiles(new Set(fileList.files.map((f) => f.id)));
    }
  }, [fileList, passwordVerified]);

  if (embedded) {
    return (
      <>
      <BoxDownloadView
        fileList={fileList}
        loading={loading}
        errorTitle={errorTitleKey ? t(errorTitleKey) : ''}
        errorDesc={errorDescKey ? t(errorDescKey) : errorDescFallback}
        passwordVerified={passwordVerified}
        password={password}
        showPassword={showPassword}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        isP2PDownload={isP2PDownload}
        p2pStatus={p2pStatus}
        p2pProgress={p2pProgress}
        p2pTimeRemaining={p2pTimeRemaining}
        p2pPeerDeviceInfo={p2pPeerDeviceInfo}
        p2pActiveFileId={p2pActiveFileId}
        p2pCompletedFileIds={p2pCompletedFileIds}
        senderEnded={senderEnded}
        downloading={downloading}
        downloaded={downloaded}
        downloadProgress={downloadProgress}
        downloadAsZip={downloadAsZip}
        handleDownload={handleDownload}
        startP2PDownload={startP2PDownload}
        startBulkP2PDownload={startBulkP2PDownload}
        downloadFolderAsZip={downloadFolderAsZip}
        handleCancelP2PDownload={handleCancelP2PDownload}
        closeP2PSession={closeP2PSession}
        onReset={onReset || (() => {})}
        onComplete={onComplete}
        onRetry={onRetry}
        previews={filePreviews}
        selectedFiles={selectedFiles}
        toggleFileSelection={toggleFileSelection}
        setFilesSelected={setFilesSelected}
        selectAllFiles={selectAllFiles}
        deselectAllFiles={deselectAllFiles}
        openPreview={openPreview}
        t={t}
      />
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={closePreview}
        />
      )}
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32 pb-20">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('download.loadingFileInfo')}</p>
        </div>
      </div>
    );
  }

  if (errorTitleKey) {
    return (
      <DownloadErrorState
        errorTitle={t(errorTitleKey)}
        error={errorDescKey ? t(errorDescKey) : errorDescFallback}
        onRetry={onRetry}
        t={t}
      />
    );
  }

  if (!fileList) {
    return null;
  }

  if (fileList.has_password && !passwordVerified) {
    return (
      <PasswordForm
        password={password}
        showPassword={showPassword}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        handlePasswordSubmit={handlePasswordSubmit}
        t={t}
      />
    );
  }

  if (fileList.files.length === 1) {
    const file = fileList.files[0];

    return (
      <>
        <SingleFileView
          file={file}
          fileList={fileList}
          isP2PDownload={isP2PDownload}
          p2pStatus={p2pStatus}
          p2pProgress={p2pProgress}
          p2pTimeRemaining={p2pTimeRemaining}
          p2pPeerDeviceInfo={p2pPeerDeviceInfo}
          downloading={downloading}
          downloadProgress={downloadProgress}
          downloadTimeRemaining={downloadTimeRemaining}
          loadingPreview={loadingPreview}
          singleFilePreviewUrl={singleFilePreviewUrl}
          singleFileThumbnail={singleFileThumbnail}
          handleDownload={handleDownload}
          handleCancelDownload={handleCancelDownload}
          handleCancelP2PDownload={handleCancelP2PDownload}
          closeP2PSession={closeP2PSession}
          setP2pEnabled={setP2pEnabled}
          openPreview={openPreview}
          navigate={navigate}
          t={t}
          language={language}
        />
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={closePreview}
          />
        )}
      </>
    );
  }

  if (isP2PDownload && fileList.files.length > 1) {
    const allP2PCompleted = fileList.files.every(f => p2pCompletedFileIds.has(f.id));
    const anyP2PDownloading = p2pActiveFileId && (p2pStatus === 'downloading' || p2pStatus === 'connecting' || p2pStatus === 'processing');
    const awaitingNextSelection = !anyP2PDownloading && !allP2PCompleted && p2pCompletedFileIds.size > 0;

    if (senderEnded && !allP2PCompleted && p2pCompletedFileIds.size > 0) {
      return (
        <div className="min-h-full flex flex-col items-center justify-center pt-12 pb-20 px-4">
          <style>{`.p2p-end-check{stroke-dasharray:20;stroke-dashoffset:20;animation:drawP2PEndCheck .6s ease-out forwards}@keyframes drawP2PEndCheck{to{stroke-dashoffset:0}}`}</style>
          <div className="w-full max-w-md mx-auto text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-500/15">
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" className="p2p-end-check" /></svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">{t('download.receiveCompleteTitle')}</h1>
            <p className="text-muted-foreground mb-8">{t('download.filesReceived', { count: p2pCompletedFileIds.size })}</p>
            <Button onClick={() => navigate('/')} size="lg">{t('common.done')}</Button>
          </div>
        </div>
      );
    }

    const p2pTree = buildFileTree(fileList.files, fileList.empty_folders ?? []);
    const p2pHasFolders = p2pTree.some((n) => n.kind === 'folder');
    const p2pFileRow = (fileId: string, fileName: string, fileSize: number, showDownload: boolean) => {
      const isActive = p2pActiveFileId === fileId;
      const isDownloading = isActive && (p2pStatus === 'downloading' || p2pStatus === 'connecting');
      const isCompleted = p2pCompletedFileIds.has(fileId);
      return (
        <>
          {isCompleted && (
            <div className="flex-shrink-0 mr-3">
              <FileThumbnail source={filePreviews?.[fileId] ?? null} fileName={fileName} size="sm" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={cn('transition-transform duration-300 ease-out', !isDownloading && 'translate-y-[7px]')}>
              <TruncatedFilename name={fileName} className="text-sm font-semibold text-foreground" />
              <div className="flex items-center justify-between gap-2 mt-0.5 leading-none">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(fileSize)}</span>
                {isDownloading && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{p2pTimeRemaining || t('format.calculating')}</span>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">{p2pProgress}%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 h-1.5">
              <div className={cn('w-full h-full bg-secondary rounded-full overflow-hidden transition-opacity duration-300', isDownloading ? 'opacity-100' : 'opacity-0')}>
                <div className="bg-primary h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${p2pProgress}%` }} />
              </div>
            </div>
          </div>
          {isCompleted ? (
            <span className="flex-shrink-0 self-center ml-2 text-green-600 text-sm font-medium whitespace-nowrap">✓ {t('common.done')}</span>
          ) : isDownloading ? (
            <Hint label={t('download.cancelDownload')}>
              <button onClick={handleCancelP2PDownload} className="flex-shrink-0 self-center ml-1 -mr-2 p-1 can-hover:hover:bg-accent active:bg-accent rounded-md transition-colors" aria-label={t('download.cancelDownload')}>
                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </Hint>
          ) : showDownload ? (
            <Hint label={t('common.download')}>
              <Button onClick={() => startP2PDownload(fileId)} disabled={bulkP2PDownloading || Boolean(anyP2PDownloading)} size="icon" aria-label={t('common.download')} className="flex-shrink-0 ml-2 md:h-8 md:w-8">
                <ArrowDownTrayIcon strokeWidth={2.5} />
              </Button>
            </Hint>
          ) : null}
        </>
      );
    };

    return (
      <div className="min-h-full flex flex-col items-center justify-center pt-12 pb-20 px-4">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                anyP2PDownloading ? 'bg-card border border-foreground/[0.09]' : 'bg-green-100 dark:bg-green-500/15'
              )}>
                {anyP2PDownloading ? (
                  <Spinner size="xl" />
                ) : allP2PCompleted ? (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" className="download-checkmark-path" />
                  </svg>
                ) : awaitingNextSelection ? (
                  <PauseBarsIcon className="w-9 h-9 text-green-600" />
                ) : (
                  <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              {allP2PCompleted ? t('download.receiveCompleteTitle') :
               anyP2PDownloading ? t('download.downloading') :
               awaitingNextSelection ? t('download.awaitingNextSelection') :
               t('download.readyToReceive')}
            </h1>
            <p className="text-muted-foreground">
              {allP2PCompleted ? t('download.receivedSuccessfully') :
               anyP2PDownloading ? (p2pPeerDeviceInfo ? t('download.receivingFrom', { device: p2pPeerDeviceInfo }) : t('download.receivingPleaseWait')) :
               awaitingNextSelection ? t('download.awaitingNextSelectionDesc') :
               p2pPeerDeviceInfo ? t('download.connectedToDevice', { device: p2pPeerDeviceInfo }) : t('download.connectionSuccess')}
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

          <Card className="rounded-3xl border-2 p-6 md:p-8">
            {fileList.description && (
              <div className="mb-8 p-4 bg-muted rounded-lg border border-foreground/[0.09]">
                <p className="text-foreground break-words whitespace-pre-wrap">{fileList.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {t('download.fileListCount', { count: fileList.total_count })}
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-2.5 mb-8" style={{ containerType: 'inline-size' }}>
              {p2pHasFolders ? (
                p2pTree.map((node) => {
                  if (node.kind === 'file') {
                    return <div key={node.id} data-row className="flex items-center px-4 py-2 bg-muted rounded-lg border border-foreground/[0.09]">{p2pFileRow(node.id, node.name, node.size, true)}</div>;
                  }
                  const hasChildren = node.children.length > 0;
                  const isOpen = hasChildren && openP2PFolders.has(node.path);
                  return (
                    <div key={`folder:${node.path}`} className="bg-muted rounded-lg border border-foreground/[0.09] overflow-hidden">
                      <div
                        data-row
                        onClick={hasChildren ? () => toggleP2PFolder(node.path) : undefined}
                        className={cn('flex items-center gap-3 px-4 py-3', hasChildren && 'cursor-pointer can-hover:hover:bg-accent active:bg-accent transition-colors')}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded bg-background flex items-center justify-center">
                          <FolderIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{node.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasChildren
                              ? `${t('upload.folderItemCount', { count: nodeFileCount(node) })} · ${formatFileSize(nodeSize(node))}`
                              : t('upload.folderEmpty')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasChildren && (
                            <ChevronDownIcon className={cn('w-5 h-5 text-muted-foreground/60 transition-transform', isOpen && 'rotate-180')} />
                          )}
                          <Hint label={t('common.download')}>
                            <Button
                              onClick={(e) => { e.stopPropagation(); downloadFolderAsZip(node.path); }}
                              disabled={bulkP2PDownloading || Boolean(anyP2PDownloading)}
                              size="icon"
                              aria-label={t('common.download')}
                              className="md:h-8 md:w-8"
                            >
                              <ArrowDownTrayIcon strokeWidth={2.5} />
                            </Button>
                          </Hint>
                        </div>
                      </div>
                      {hasChildren && (
                        <Collapsible open={isOpen}>
                          <div className="px-4 pb-3">
                            <div className="border-t border-foreground/[0.08] pt-2.5 space-y-1">
                              <FolderTreeRows
                                nodes={node.children}
                                depth={1}
                                openFolders={openP2PFolders}
                                toggleFolder={toggleP2PFolder}
                                t={t}
                                renderFile={(file, depth) => (
                                  <div data-row className="flex items-center -mx-2.5 px-2.5 py-2 rounded-lg" style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}>
                                    {p2pFileRow(file.id, file.name, file.size, false)}
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        </Collapsible>
                      )}
                    </div>
                  );
                })
              ) : (
                fileList.files.map((file) => (
                  <div key={file.id} className="flex items-center px-4 py-2 bg-muted rounded-lg border border-foreground/[0.09]">{p2pFileRow(file.id, file.file_name, file.file_size, true)}</div>
                ))
              )}
            </div>

            <div className="mt-4 -mb-2 md:mb-1 flex flex-col items-center gap-3">
              {bulkP2PDownloading ? (
                <p className="text-sm text-muted-foreground text-center">
                  {t('download.bulkProgress', { done: bulkTotalRef.current - bulkRemaining, total: bulkTotalRef.current })
                    || `${bulkTotalRef.current - bulkRemaining} / ${bulkTotalRef.current} 파일 받는 중…`}
                </p>
              ) : p2pCompletedFileIds.size < fileList.files.length ? (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    variant="default"
                    onClick={startBulkP2PDownload}
                    disabled={!!anyP2PDownloading}
                    className="w-full"
                  >
                    {t('download.downloadAll') || '전체 다운로드'}
                  </Button>
                  {anyP2PDownloading || p2pCompletedFileIds.size > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => { closeP2PSession(); navigate('/'); }}
                      disabled={!!anyP2PDownloading}
                      className="w-full"
                    >
                      {t('common.done')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/')}
                      className="w-full"
                    >
                      {t('common.back')}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => { closeP2PSession(); navigate('/'); }}
                  className="w-full"
                >
                  {t('common.done')}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <MultiFileList
        fileList={fileList}
        selectedFiles={selectedFiles}
        toggleFileSelection={toggleFileSelection}
        setFilesSelected={setFilesSelected}
        selectAllFiles={selectAllFiles}
        deselectAllFiles={deselectAllFiles}
        downloading={downloading}
        downloaded={downloaded}
        downloadProgress={downloadProgress}
        downloadTimeRemaining={downloadTimeRemaining}
        downloadAsZip={downloadAsZip}
        handleDownload={handleDownload}
        handleCancelDownload={handleCancelDownload}
        navigate={navigate}
        previews={filePreviews}
        openPreview={openPreview}
        zipping={zipping}
        zipDone={zipDone}
        zipTotal={zipTotal}
        zipError={zipError}
        canStreamZip={canStreamToDisk()}
        handleStructuredZip={handleStructuredZip}
        handleCancelZip={handleCancelZip}
        handleZipFallbackToIndividual={handleZipFallbackToIndividual}
        t={t}
      />
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={closePreview}
        />
      )}
    </>
  );
};

export default DownloadFilePage;
