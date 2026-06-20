import { useEffect, useRef, useState, useCallback } from 'react';
import { SignalingMessage, FileInfo } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from '../context/ToastContext';
import { getDeviceInfo } from '../utils/format';
import { useTranslation, translateSignalingError } from '../i18n';

interface UseP2PDownloaderProps {
  shareCode: string;
  fileInfo: FileInfo;
  enabled: boolean;
  onComplete: (blob: Blob) => void;
  onPeerFileRemoved?: (fileName: string) => void;
  password?: string;
}

export const useP2PDownloader = ({ shareCode, fileInfo, enabled, onComplete, onPeerFileRemoved, password }: UseP2PDownloaderProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled'>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [peerDeviceInfo, setPeerDeviceInfo] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const sessionActiveRef = useRef<boolean>(false);
  const iceConnectedRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bounded retry of downloader_join when the receiver joins before the sender
  // has registered (backend "Uploader is not online"); re-joins the same socket.
  const joinRetryCountRef = useRef<number>(0);
  const joinRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const receivedBlobsRef = useRef<Blob[]>([]);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const pendingSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);
  const downloadStartTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const currentFileNameRef = useRef<string>('');
  const completedFileRef = useRef<boolean>(false);
  const actualFileSizeRef = useRef<number>(0);
  const actualFileTypeRef = useRef<string>('');

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onPeerFileRemovedRef = useRef(onPeerFileRemoved);
  onPeerFileRemovedRef.current = onPeerFileRemoved;
  const shareCodeRef = useRef(shareCode);
  shareCodeRef.current = shareCode;

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return t('format.secondsRemaining', { seconds: Math.max(1, Math.ceil(seconds)) });
    if (seconds < 3600) return t('format.minutesSecondsRemaining', { minutes: Math.floor(seconds / 60), seconds: Math.ceil(seconds % 60) });
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return t('format.hoursMinutesSecondsRemaining', { hours, minutes: mins, seconds: secs });
  }, [t]);

  const resetPerFileState = useCallback((info: FileInfo) => {
    setProgress(0);
    setTimeRemaining('');
    receivedBlobsRef.current = [];
    pendingChunksRef.current = [];
    pendingSizeRef.current = 0;
    receivedSizeRef.current = 0;
    downloadStartTimeRef.current = Date.now();
    lastTimeUpdateRef.current = 0;
    currentFileNameRef.current = info.file_name;
    completedFileRef.current = false;
    actualFileSizeRef.current = info.file_size;
    actualFileTypeRef.current = info.file_type;
  }, []);

  const finishCurrentFile = useCallback(() => {
    if (completedFileRef.current) return;
    completedFileRef.current = true;
    setProgress(100);
    setTimeRemaining('');

    if (pendingChunksRef.current.length > 0) {
      receivedBlobsRef.current.push(new Blob(pendingChunksRef.current));
      pendingChunksRef.current = [];
      pendingSizeRef.current = 0;
    }
    const blob = new Blob(receivedBlobsRef.current, { type: actualFileTypeRef.current });
    setStatus('completed');
    onCompleteRef.current(blob);
    receivedBlobsRef.current = [];
  }, []);

  const cleanupSession = useCallback(() => {
    isCleaningUpRef.current = true;
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
    if (pendingErrorTimerRef.current) {
      clearTimeout(pendingErrorTimerRef.current);
      pendingErrorTimerRef.current = null;
    }
    if (joinRetryTimerRef.current) {
      clearTimeout(joinRetryTimerRef.current);
      joinRetryTimerRef.current = null;
    }
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close(); } catch {}
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    sessionActiveRef.current = false;
    iceConnectedRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo || !fileInfo.file_name) return;
    if (sessionActiveRef.current) return;

    sessionActiveRef.current = true;
    isCleaningUpRef.current = false;
    iceConnectedRef.current = false;
    peerIdRef.current = generatePeerId();
    resetPerFileState(fileInfo);
    setStatus('connecting');
    setPeerDeviceInfo(null);
    joinRetryCountRef.current = 0;

    const sendJoin = () => {
      if (isCleaningUpRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      sendSignalingMessage(ws, {
        type: 'downloader_join',
        share_code: shareCodeRef.current,
        peer_id: peerIdRef.current,
        file_name: currentFileNameRef.current,
        device_info: getDeviceInfo(),
        ...(password ? { password } : {})
      });
    };

    const setupP2PConnection = async () => {
      try {
        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });
        wsRef.current = ws;

        ws.onopen = () => {
          sendJoin();
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!isCleaningUpRef.current && !completedFileRef.current) {
            setStatus('error');
            toast.error(t('p2p.connectionError'));
          }
        };

        ws.onclose = () => {};

        keepaliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendSignalingMessage(ws, { type: 'ping' });
          }
        }, 30000);

        const pc = await createPeerConnection();
        pcRef.current = pc;

        const connectionTimeout = setTimeout(() => {
          if (!isCleaningUpRef.current && !iceConnectedRef.current && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
            setStatus('error');
            toast.error(t('p2p.connectionTimeout'));
            cleanupSession();
          }
        }, 15000);

        pc.ondatachannel = (event) => {
          clearTimeout(connectionTimeout);
          const dataChannel = event.channel;
          dataChannelRef.current = dataChannel;
          dataChannel.binaryType = 'arraybuffer';

          dataChannel.onopen = () => {
            setStatus('downloading');
            downloadStartTimeRef.current = Date.now();
          };

          dataChannel.onclose = () => {
            if (isCleaningUpRef.current) return;
            if (!completedFileRef.current && receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSizeRef.current * 0.95) {
              finishCurrentFile();
            } else if (!completedFileRef.current) {
              if (pendingErrorTimerRef.current) clearTimeout(pendingErrorTimerRef.current);
              pendingErrorTimerRef.current = setTimeout(() => {
                if (!isCleaningUpRef.current && !completedFileRef.current) {
                  setStatus('error');
                  toast.error(t('p2p.receiveError'));
                }
                pendingErrorTimerRef.current = null;
              }, 2000);
            }
          };

          dataChannel.onmessage = (event) => {
            if (typeof event.data === 'string') {
              if (event.data === '__EOF__') {
                if (completedFileRef.current) return;
                setTimeout(() => {
                  setStatus('processing');
                  setTimeout(() => {
                    finishCurrentFile();
                  }, 0);
                }, 0);
                return;
              }

              try {
                const metadata = JSON.parse(event.data);
                if (metadata.type === 'file_metadata') {
                  actualFileSizeRef.current = metadata.fileSize;
                  actualFileTypeRef.current = metadata.fileType;
                  downloadStartTimeRef.current = Date.now();
                  return;
                }
                if (metadata.type === 'file_removed' && metadata.fileName) {
                  onPeerFileRemovedRef.current?.(metadata.fileName);
                  return;
                }
              } catch {}
              return;
            }

            const chunk = event.data as ArrayBuffer;
            pendingChunksRef.current.push(chunk);
            pendingSizeRef.current += chunk.byteLength;
            receivedSizeRef.current += chunk.byteLength;

            if (pendingSizeRef.current >= 16 * 1024 * 1024) {
              receivedBlobsRef.current.push(new Blob(pendingChunksRef.current));
              pendingChunksRef.current = [];
              pendingSizeRef.current = 0;
            }

            const now = Date.now();
            if (now - lastTimeUpdateRef.current >= 200) {
              const target = actualFileSizeRef.current || 1;
              const progressPercent = Math.min((receivedSizeRef.current / target) * 100, 100);
              setProgress(Math.round(progressPercent));

              const elapsedMs = now - downloadStartTimeRef.current;
              if (elapsedMs >= 2000 && receivedSizeRef.current >= target * 0.02) {
                const bytesPerMs = receivedSizeRef.current / elapsedMs;
                const remainingBytes = target - receivedSizeRef.current;
                const remainingSeconds = remainingBytes / bytesPerMs / 1000;
                setTimeRemaining(formatTime(remainingSeconds));
              }
              lastTimeUpdateRef.current = now;
            }
          };

          dataChannel.onerror = (error) => {
            console.error('DataChannel error:', error);
            pendingErrorTimerRef.current = setTimeout(() => {
              if (!isCleaningUpRef.current && !completedFileRef.current) {
                setStatus('error');
                toast.error(t('p2p.receiveError'));
              }
              pendingErrorTimerRef.current = null;
            }, 2000);
          };
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current) {
            sendSignalingMessage(wsRef.current, {
              type: 'ice_candidate',
              share_code: shareCodeRef.current,
              candidate: JSON.stringify(event.candidate),
              sdp_mid: event.candidate.sdpMid,
              sdp_m_line_index: event.candidate.sdpMLineIndex,
              peer_id: peerIdRef.current
            });
          }
        };

        let turnFallbackToastShown = false;
        pc.oniceconnectionstatechange = async () => {
          const s = pc.iceConnectionState;
          if (s === 'connected' || s === 'completed') {
            clearTimeout(connectionTimeout);
            iceConnectedRef.current = true;
            if (status !== 'downloading') setStatus('downloading');

            if (!turnFallbackToastShown) {
              try {
                const stats = await pc.getStats();
                let isRelay = false;
                stats.forEach((report) => {
                  if (isRelay) return;
                  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    const localCandidate = stats.get(report.localCandidateId);
                    if (localCandidate?.candidateType === 'relay') {
                      isRelay = true;
                    }
                  }
                });
                if (isRelay) {
                  turnFallbackToastShown = true;
                  toast.info(t('p2p.turnFallback'));
                }
              } catch {}
            }
          } else if (s === 'failed') {
            clearTimeout(connectionTimeout);
            if (!completedFileRef.current && receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSizeRef.current * 0.95) {
              finishCurrentFile();
            } else {
              pendingErrorTimerRef.current = setTimeout(() => {
                if (!completedFileRef.current && !isCleaningUpRef.current) {
                  setStatus('error');
                  toast.error(t('p2p.connectionFailed'));
                }
                pendingErrorTimerRef.current = null;
              }, 2000);
            }
          }
        };

      } catch (error) {
        console.error('Failed to setup P2P connection:', error);
        if (!isCleaningUpRef.current) {
          setStatus('error');
          toast.error(t('p2p.setupFailed'));
        }
      }
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const ws = wsRef.current;
      if (!ws) return;

      // Handle 'error' before requiring pc: pc may still be awaiting TURN creds
      // when the early "Uploader is not online" reply arrives, so gating behind
      // pc would drop it and skip the retry.
      if (message.type === 'error') {
        const isUploaderNotReady =
          typeof message.message === 'string' &&
          message.message.includes('Uploader is not online');
        const MAX_JOIN_RETRIES = 8;
        if (
          isUploaderNotReady &&
          !isCleaningUpRef.current &&
          !completedFileRef.current &&
          joinRetryCountRef.current < MAX_JOIN_RETRIES
        ) {
          joinRetryCountRef.current += 1;
          const delay = Math.min(250 + joinRetryCountRef.current * 100, 700);
          if (joinRetryTimerRef.current) clearTimeout(joinRetryTimerRef.current);
          joinRetryTimerRef.current = setTimeout(() => {
            joinRetryTimerRef.current = null;
            sendJoin();
          }, delay);
          return;
        }
        console.error('Signaling error:', message.message);
        if (!isCleaningUpRef.current && !completedFileRef.current) {
          setStatus('error');
          toast.error(translateSignalingError(message.message, t));
        }
        return;
      }

      const pc = pcRef.current;
      if (!pc) return;

      switch (message.type) {
        case 'peer_matched':
          if (message.device_info) {
            setPeerDeviceInfo(message.device_info);
          }
          break;

        case 'offer':
          if (message.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: message.sdp
            }));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignalingMessage(ws, {
              type: 'answer',
              share_code: shareCodeRef.current,
              sdp: answer.sdp,
              peer_id: peerIdRef.current
            });
          }
          break;

        case 'ice_candidate':
          if (message.candidate) {
            try {
              const candidate = JSON.parse(message.candidate);
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          }
          break;

        case 'uploader_offline':
        case 'uploader_cancelled':
          if (pendingErrorTimerRef.current) {
            clearTimeout(pendingErrorTimerRef.current);
            pendingErrorTimerRef.current = null;
          }
          isCleaningUpRef.current = true;
          if (!completedFileRef.current) {
            setStatus('cancelled');
            toast.warning(t('p2p.senderDisconnected'));
          }
          cleanupSession();
          break;
      }
    };

    setupP2PConnection();

    return () => {
      isCleaningUpRef.current = true;
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode]);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo || !fileInfo.file_name) return;
    if (!sessionActiveRef.current) return;
    if (currentFileNameRef.current === fileInfo.file_name) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    resetPerFileState(fileInfo);
    setStatus('downloading');
    sendSignalingMessage(ws, {
      type: 'file_request',
      share_code: shareCode,
      file_name: fileInfo.file_name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode, fileInfo?.file_name, fileInfo?.file_size, fileInfo?.file_type]);

  const reset = useCallback(() => {
    setStatus('waiting');
    setProgress(0);
    setTimeRemaining('');
    setPeerDeviceInfo(null);
  }, []);

  const cancelDownload = useCallback(() => {
    isCleaningUpRef.current = true;
    cleanupSession();
    receivedBlobsRef.current = [];
    pendingChunksRef.current = [];
    pendingSizeRef.current = 0;
    receivedSizeRef.current = 0;
    setStatus('cancelled');
    setProgress(0);
    setTimeRemaining('');
    toast.info(t('p2p.downloadCancelled'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupSession]);

  const close = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendSignalingMessage(wsRef.current, {
        type: 'transfer_complete',
        share_code: shareCodeRef.current,
      });
    }
    cleanupSession();
  }, [cleanupSession]);

  return { status, progress, timeRemaining, peerDeviceInfo, reset, cancelDownload, close };
};
