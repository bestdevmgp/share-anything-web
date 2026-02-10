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
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'downloading' | 'completed' | 'error' | 'cancelled'>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [peerDeviceInfo, setPeerDeviceInfo] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef<number>(0);
  const downloadStartTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const fileIdRef = useRef<string>('');
  const completedRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return t('format.secondsShort', { seconds: Math.ceil(seconds) });
    if (seconds < 3600) return t('format.minutesSecondsShort', { minutes: Math.floor(seconds / 60), seconds: Math.ceil(seconds % 60) });
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return t('format.hoursMinutesSecondsShort', { hours, minutes: mins, seconds: secs });
  }, [t]);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo || !fileInfo.file_name) {
      return;
    }

    const currentFileId = `${shareCode}-${fileInfo.file_name}-${fileInfo.file_size}`;

    if (fileIdRef.current === currentFileId && status === 'completed') {
      return;
    }

    console.log('[useP2PDownloader] Setting up P2P connection for:', fileInfo.file_name);

    setStatus('connecting');
    setProgress(0);
    setTimeRemaining('');
    receivedChunksRef.current = [];
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
          console.log('[useP2PDownloader] WebSocket connected, sending downloader_join for file:', fileInfo.file_name);
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

        ws.onclose = (event) => {
          console.log('[useP2PDownloader] WebSocket closed - Code:', event.code, 'Reason:', event.reason);
        };

        const pc = await createPeerConnection();
        pcRef.current = pc;

        // Connection timeout - if not connected within 10 seconds, consider it failed
        const connectionTimeout = setTimeout(() => {
          if (!isCleaningUpRef.current && !completedRef.current && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
            console.log('[useP2PDownloader] Connection timeout - ICE state:', pc.iceConnectionState);
            setStatus('error');
            toast.error(t('p2p.connectionTimeout'));
            cleanup();
          }
        }, 10000);

        let metadataReceived = false;
        let actualFileSize = fileInfo.file_size;
        let actualFileType = fileInfo.file_type;

        pc.ondatachannel = (event) => {
          console.log('[useP2PDownloader] DataChannel received');
          clearTimeout(connectionTimeout);
          const dataChannel = event.channel;

          dataChannel.onopen = () => {
            console.log('[useP2PDownloader] DataChannel opened');
            setStatus('downloading');
            downloadStartTimeRef.current = Date.now();
          };

          dataChannel.onclose = () => {
            console.log('[useP2PDownloader] DataChannel closed, received:', receivedSizeRef.current, '/', actualFileSize);

            if (!completedRef.current && receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSize * 0.95) {
              console.log('[useP2PDownloader] Connection closed but got most data, completing transfer');
              completedRef.current = true;
              const blob = new Blob(receivedChunksRef.current, { type: actualFileType });
              setStatus('completed');
              setProgress(100);
              setTimeRemaining('');
              onComplete(blob);
              cleanup();
            }
          };

          dataChannel.onmessage = (event) => {
            if (typeof event.data === 'string') {
              if (event.data === '__EOF__') {
                if (completedRef.current) return;
                console.log('[useP2PDownloader] Received EOF marker, completing transfer');
                completedRef.current = true;
                const blob = new Blob(receivedChunksRef.current, { type: actualFileType });
                setStatus('completed');
                setProgress(100);
                setTimeRemaining('');
                onComplete(blob);

                if (wsRef.current) {
                  sendSignalingMessage(wsRef.current, {
                    type: 'transfer_complete',
                    share_code: shareCode
                  });
                }

                // Delay cleanup to ensure everything is processed
                setTimeout(() => cleanup(), 1000);
                return;
              }

              if (!metadataReceived) {
                try {
                  const metadata = JSON.parse(event.data);
                  if (metadata.type === 'file_metadata') {
                    console.log('[useP2PDownloader] Received metadata:', metadata);
                    actualFileSize = metadata.fileSize;
                    actualFileType = metadata.fileType;
                    metadataReceived = true;
                    downloadStartTimeRef.current = Date.now();
                    return;
                  }
                } catch {
                  // Not JSON, ignore
                }
              }
              return;
            }

            // Handle binary data (file chunks)
            const chunk = event.data as ArrayBuffer;
            receivedChunksRef.current.push(chunk);
            receivedSizeRef.current += chunk.byteLength;

            const progressPercent = Math.min((receivedSizeRef.current / actualFileSize) * 100, 99);
            setProgress(Math.round(progressPercent));

            const now = Date.now();
            const elapsedMs = now - downloadStartTimeRef.current;
            if (elapsedMs > 500 && receivedSizeRef.current > 0) {
              if (now - lastTimeUpdateRef.current >= 1000) {
                const bytesPerMs = receivedSizeRef.current / elapsedMs;
                const remainingBytes = actualFileSize - receivedSizeRef.current;
                const remainingSeconds = remainingBytes / bytesPerMs / 1000;
                setTimeRemaining(formatTime(remainingSeconds));
                lastTimeUpdateRef.current = now;
              }
            }
          };

          dataChannel.onerror = (error) => {
            console.error('DataChannel error:', error);
            if (!isCleaningUpRef.current && !completedRef.current) {
              setStatus('error');
              toast.error(t('p2p.receiveError'));
            }
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
          console.log('[useP2PDownloader] ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            clearTimeout(connectionTimeout);
            setStatus('downloading');

            // Check if using TURN relay
            try {
              const stats = await pc.getStats();
              stats.forEach((report) => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                  const localCandidate = stats.get(report.localCandidateId);
                  if (localCandidate?.candidateType === 'relay') {
                    console.log('[useP2PDownloader] Connected via TURN relay');
                    toast.info(t('p2p.turnFallback'));
                  } else {
                    console.log('[useP2PDownloader] Connected via direct P2P:', localCandidate?.candidateType);
                  }
                }
              });
            } catch (err) {
              console.warn('[useP2PDownloader] Failed to check connection type:', err);
            }
          } else if (pc.iceConnectionState === 'failed') {
            clearTimeout(connectionTimeout);
            // Connection truly failed - check if we have enough data
            if (!completedRef.current && receivedSizeRef.current > 0 && receivedSizeRef.current >= actualFileSize * 0.95) {
              console.log('[useP2PDownloader] ICE failed but got most data, completing');
              completedRef.current = true;
              const blob = new Blob(receivedChunksRef.current, { type: actualFileType });
              setStatus('completed');
              setProgress(100);
              onComplete(blob);
            } else if (!completedRef.current && !isCleaningUpRef.current) {
              setStatus('error');
              toast.error(t('p2p.connectionFailed'));
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
          console.log('[useP2PDownloader] Peer matched! Device:', message.device_info, 'Waiting for offer...');
          if (message.device_info) {
            setPeerDeviceInfo(message.device_info);
          }
          break;

        case 'offer':
          console.log('[useP2PDownloader] Received offer from uploader');
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
            } catch (err) {
              console.warn('[useP2PDownloader] Failed to add ICE candidate:', err);
            }
          }
          break;

        case 'uploader_offline':
          if (!isCleaningUpRef.current && !completedRef.current) {
            setStatus('error');
            toast.error(t('p2p.senderDisconnected'));
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
    console.log('[useP2PDownloader] Cancelling download');
    isCleaningUpRef.current = true;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    receivedChunksRef.current = [];
    receivedSizeRef.current = 0;
    setStatus('cancelled');
    setProgress(0);
    setTimeRemaining('');
    toast.info(t('p2p.downloadCancelled'));
  }, []);

  return { status, progress, timeRemaining, peerDeviceInfo, reset, cancelDownload };
};
