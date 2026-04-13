import { useEffect, useRef, useState, useCallback } from 'react';
import { SignalingMessage, FileInfo } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from '../context/ToastContext';
import { getDeviceInfo } from '../utils/format';
import { useTranslation } from '../i18n';

interface UseP2PDownloaderProps {
  shareCode: string;
  fileInfo: FileInfo;
  enabled: boolean;
  onComplete: (blob: Blob) => void;
}

export const useP2PDownloader = ({ shareCode, fileInfo, enabled, onComplete }: UseP2PDownloaderProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled'>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [peerDeviceInfo, setPeerDeviceInfo] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const receivedBlobsRef = useRef<Blob[]>([]);
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);
  const pendingSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);
  const downloadStartTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const fileIdRef = useRef<string>('');
  const completedRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false);
  const pendingErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return t('format.secondsRemaining', { seconds: Math.max(1, Math.ceil(seconds)) });
    if (seconds < 3600) return t('format.minutesSecondsRemaining', { minutes: Math.floor(seconds / 60), seconds: Math.ceil(seconds % 60) });
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return t('format.hoursMinutesSecondsRemaining', { hours, minutes: mins, seconds: secs });
  }, [t]);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo || !fileInfo.file_name) {
      return;
    }

    const currentFileId = `${shareCode}-${fileInfo.file_name}-${fileInfo.file_size}`;

    if (fileIdRef.current === currentFileId && status === 'completed') {
      return;
    }

    setStatus('connecting');
    setProgress(0);
    setTimeRemaining('');
    receivedBlobsRef.current = [];
    pendingChunksRef.current = [];
    pendingSizeRef.current = 0;
    receivedSizeRef.current = 0;
    downloadStartTimeRef.current = 0;
    lastTimeUpdateRef.current = 0;
    peerIdRef.current = generatePeerId();
    fileIdRef.current = currentFileId;
    completedRef.current = false;
    isCleaningUpRef.current = false;

    const setupP2PConnection = async () => {
      try {
        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });

        wsRef.current = ws;

        ws.onopen = () => {
          sendSignalingMessage(ws, {
            type: 'downloader_join',
            share_code: shareCode,
            peer_id: peerIdRef.current,
            file_name: fileInfo.file_name,
            device_info: getDeviceInfo()
          });
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!isCleaningUpRef.current && !completedRef.current) {
            setStatus('error');
            toast.error(t('p2p.connectionError'));
          }
        };

        ws.onclose = () => {
        };

        keepaliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendSignalingMessage(ws, { type: 'ping' });
          }
        }, 30000);

        const pc = await createPeerConnection();
        pcRef.current = pc;

        // 10초 연결 타임아웃
        const connectionTimeout = setTimeout(() => {
          if (!isCleaningUpRef.current && !completedRef.current && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
            setStatus('error');
            toast.error(t('p2p.connectionTimeout'));
            cleanup();
          }
        }, 10000);

        let metadataReceived = false;
        let actualFileSize = fileInfo.file_size;
        let actualFileType = fileInfo.file_type;

        pc.ondatachannel = (event) => {
          clearTimeout(connectionTimeout);
          const dataChannel = event.channel;

          dataChannel.binaryType = 'arraybuffer';

          dataChannel.onopen = () => {
            setStatus('downloading');
            downloadStartTimeRef.current = Date.now();
          };

          dataChannel.onclose = () => {
            if (completedRef.current || isCleaningUpRef.current) return;
            if (receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSize * 0.95) {
              completedRef.current = true;
              if (pendingChunksRef.current.length > 0) {
                receivedBlobsRef.current.push(new Blob(pendingChunksRef.current));
                pendingChunksRef.current = [];
                pendingSizeRef.current = 0;
              }
              const blob = new Blob(receivedBlobsRef.current, { type: actualFileType });
              setStatus('completed');
              setProgress(100);
              setTimeRemaining('');
              onComplete(blob);
              cleanup();
            } else {
              setStatus('error');
              toast.error(t('p2p.receiveError'));
            }
          };

          dataChannel.onmessage = (event) => {
            if (typeof event.data === 'string') {
              if (event.data === '__EOF__') {
                if (completedRef.current) return;
                completedRef.current = true;
                setProgress(100);
                setTimeRemaining('');

                // 100% 표시 후 processing 상태로 전환하여 Blob 생성
                setTimeout(() => {
                  setStatus('processing');

                  setTimeout(() => {
                    if (pendingChunksRef.current.length > 0) {
                      receivedBlobsRef.current.push(new Blob(pendingChunksRef.current));
                      pendingChunksRef.current = [];
                      pendingSizeRef.current = 0;
                    }
                    const blob = new Blob(receivedBlobsRef.current, { type: actualFileType });
                    setStatus('completed');
                    onComplete(blob);

                    if (wsRef.current) {
                      sendSignalingMessage(wsRef.current, {
                        type: 'transfer_complete',
                        share_code: shareCode
                      });
                    }

                    setTimeout(() => cleanup(), 1000);
                  }, 0);
                }, 0);
                return;
              }

              if (!metadataReceived) {
                try {
                  const metadata = JSON.parse(event.data);
                  if (metadata.type === 'file_metadata') {
                    actualFileSize = metadata.fileSize;
                    actualFileType = metadata.fileType;
                    metadataReceived = true;
                    downloadStartTimeRef.current = Date.now();
                    return;
                  }
                } catch {
                }
              }
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
            if (now - lastTimeUpdateRef.current >= 1000) {
              const progressPercent = Math.min((receivedSizeRef.current / actualFileSize) * 100, 100);
              setProgress(Math.round(progressPercent));

              const elapsedMs = now - downloadStartTimeRef.current;
              if (elapsedMs > 500 && receivedSizeRef.current > 0) {
                const bytesPerMs = receivedSizeRef.current / elapsedMs;
                const remainingBytes = actualFileSize - receivedSizeRef.current;
                const remainingSeconds = remainingBytes / bytesPerMs / 1000;
                setTimeRemaining(formatTime(remainingSeconds));
              }
              lastTimeUpdateRef.current = now;
            }
          };

          dataChannel.onerror = (error) => {
            console.error('DataChannel error:', error);
            pendingErrorTimerRef.current = setTimeout(() => {
              if (!isCleaningUpRef.current && !completedRef.current) {
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
              share_code: shareCode,
              candidate: JSON.stringify(event.candidate),
              sdp_mid: event.candidate.sdpMid,
              sdp_m_line_index: event.candidate.sdpMLineIndex,
              peer_id: peerIdRef.current
            });
          }
        };

        pc.oniceconnectionstatechange = async () => {
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            clearTimeout(connectionTimeout);
            setStatus('downloading');

            try {
              const stats = await pc.getStats();
              stats.forEach((report) => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                  const localCandidate = stats.get(report.localCandidateId);
                  if (localCandidate?.candidateType === 'relay') {
                    toast.info(t('p2p.turnFallback'));
                  }
                }
              });
            } catch {
            }
          } else if (pc.iceConnectionState === 'failed') {
            clearTimeout(connectionTimeout);
            if (!completedRef.current && receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSize * 0.95) {
              completedRef.current = true;
              if (pendingChunksRef.current.length > 0) {
                receivedBlobsRef.current.push(new Blob(pendingChunksRef.current));
                pendingChunksRef.current = [];
                pendingSizeRef.current = 0;
              }
              const blob = new Blob(receivedBlobsRef.current, { type: actualFileType });
              setStatus('completed');
              setProgress(100);
              onComplete(blob);
            } else {
              pendingErrorTimerRef.current = setTimeout(() => {
                if (!completedRef.current && !isCleaningUpRef.current) {
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
      const pc = pcRef.current;
      const ws = wsRef.current;

      if (!pc || !ws) return;

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
              share_code: shareCode,
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
            } catch {
            }
          }
          break;

        case 'uploader_offline':
          if (pendingErrorTimerRef.current) {
            clearTimeout(pendingErrorTimerRef.current);
            pendingErrorTimerRef.current = null;
          }
          isCleaningUpRef.current = true;
          if (!completedRef.current) {
            setStatus('cancelled');
            toast.warning(t('p2p.senderDisconnected'));
          }
          cleanup();
          break;

        case 'uploader_cancelled':
          if (pendingErrorTimerRef.current) {
            clearTimeout(pendingErrorTimerRef.current);
            pendingErrorTimerRef.current = null;
          }
          isCleaningUpRef.current = true;
          if (!completedRef.current) {
            setStatus('cancelled');
            toast.warning(t('p2p.senderDisconnected'));
          }
          cleanup();
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          if (!isCleaningUpRef.current && !completedRef.current) {
            setStatus('error');
            toast.error(message.message || t('p2p.connectionError'));
          }
          break;
      }
    };

    const cleanup = () => {
      isCleaningUpRef.current = true;
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current);
        keepaliveIntervalRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    setupP2PConnection();

    return () => {
      isCleaningUpRef.current = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode, fileInfo.file_name, fileInfo.file_size]);

  const reset = useCallback(() => {
    setStatus('waiting');
    setProgress(0);
    setTimeRemaining('');
    setPeerDeviceInfo(null);
    fileIdRef.current = '';
  }, []);

  const cancelDownload = useCallback(() => {
    isCleaningUpRef.current = true;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    receivedBlobsRef.current = [];
    pendingChunksRef.current = [];
    pendingSizeRef.current = 0;
    receivedSizeRef.current = 0;
    setStatus('cancelled');
    setProgress(0);
    setTimeRemaining('');
    toast.info(t('p2p.downloadCancelled'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, progress, timeRemaining, peerDeviceInfo, reset, cancelDownload };
};
