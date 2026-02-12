import { useEffect, useRef, useState, useCallback } from 'react';
import { SignalingMessage } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from '../context/ToastContext';
import { getDeviceInfo } from '../utils/format';
import { useTranslation } from '../i18n';

interface FileProgress {
  fileName: string;
  progress: number;
  status: 'waiting' | 'transferring' | 'completed' | 'cancelled';
  timeRemaining: string;
}

interface UseP2PUploaderProps {
  shareCode: string;
  files: File[];
  enabled: boolean;
}

export const useP2PUploader = ({ shareCode, files, enabled }: UseP2PUploaderProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'waiting' | 'connected' | 'transferring' | 'completed'>('waiting');
  const [fileProgresses, setFileProgresses] = useState<Map<string, FileProgress>>(new Map());
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [peerDeviceInfo, setPeerDeviceInfo] = useState<string | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const isTransferringRef = useRef<boolean>(false);
  const transferStartTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const filesRef = useRef<File[]>(files);
  const cancelledRef = useRef<boolean>(false);
  const isCleaningUpRef = useRef<boolean>(false);

  useEffect(() => {
    filesRef.current = files;
    const initialProgresses = new Map<string, FileProgress>();
    files.forEach(file => {
      initialProgresses.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: 'waiting',
        timeRemaining: ''
      });
    });
    setFileProgresses(initialProgresses);
  }, [files]);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return t('format.secondsShort', { seconds: Math.ceil(seconds) });
    if (seconds < 3600) return t('format.minutesSecondsShort', { minutes: Math.floor(seconds / 60), seconds: Math.ceil(seconds % 60) });
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return t('format.hoursMinutesSecondsShort', { hours, minutes: mins, seconds: secs });
  }, [t]);

  const sendFile = useCallback((file: File, dataChannel: RTCDataChannel) => {
    const reader = new FileReader();
    const chunkSize = 16384;
    let offset = 0;
    transferStartTimeRef.current = Date.now();
    lastTimeUpdateRef.current = 0;
    cancelledRef.current = false;

    const finishTransfer = () => {
      isTransferringRef.current = false;
      setFileProgresses(prev => {
        const newMap = new Map(prev);
        const fileProgress = newMap.get(file.name);
        if (fileProgress) {
          newMap.set(file.name, {
            ...fileProgress,
            progress: 100,
            status: 'completed',
            timeRemaining: ''
          });
        }
        return newMap;
      });

      setStatus('waiting');
      setCurrentFileName('');

      if (wsRef.current) {
        sendSignalingMessage(wsRef.current, {
          type: 'transfer_complete',
          share_code: shareCode
        });
      }

      toast.success(t('p2p.transferComplete', { fileName: file.name }));

      setTimeout(() => {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        if (dataChannelRef.current) {
          dataChannelRef.current = null;
        }
      }, 2000);
    };

    const waitForBufferDrain = () => {
      if (dataChannel.bufferedAmount === 0) {
        try {
          dataChannel.send('__EOF__');
        } catch {
        }
        finishTransfer();
      } else {
        setTimeout(waitForBufferDrain, 50);
      }
    };

    reader.onload = (e) => {
      if (!e.target?.result) return;

      const buffer = e.target.result as ArrayBuffer;

      const sendChunk = () => {
        if (cancelledRef.current) {
          return;
        }

        if (offset >= buffer.byteLength) {
          waitForBufferDrain();
          return;
        }

        const chunk = buffer.slice(offset, offset + chunkSize);

        if (dataChannel.bufferedAmount > chunkSize * 10) {
          setTimeout(sendChunk, 10);
          return;
        }

        dataChannel.send(chunk);
        offset += chunkSize;

        const now = Date.now();
        if (now - lastTimeUpdateRef.current >= 1000) {
          const progressPercent = Math.min((offset / buffer.byteLength) * 100, 100);
          const elapsedMs = now - transferStartTimeRef.current;
          let timeRemainingStr = '';

          if (elapsedMs > 500 && offset > 0) {
            const bytesPerMs = offset / elapsedMs;
            const remainingBytes = buffer.byteLength - offset;
            const remainingSeconds = remainingBytes / bytesPerMs / 1000;
            timeRemainingStr = formatTime(remainingSeconds);
          }

          setFileProgresses(prev => {
            const newMap = new Map(prev);
            const fileProgress = newMap.get(file.name);
            if (fileProgress) {
              newMap.set(file.name, {
                ...fileProgress,
                progress: Math.round(progressPercent),
                status: 'transferring',
                timeRemaining: timeRemainingStr || fileProgress.timeRemaining
              });
            }
            return newMap;
          });
          lastTimeUpdateRef.current = now;
        }

        setTimeout(sendChunk, 0);
      };

      sendChunk();
    };

    reader.readAsArrayBuffer(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode, formatTime]);

  const setupPeerConnection = useCallback(async (requestedFileName: string) => {
    const file = filesRef.current.find(f => f.name === requestedFileName);
    if (!file) {
      console.error('[useP2PUploader] Requested file not found:', requestedFileName);
      toast.error(t('p2p.fileNotFound'));
      return null;
    }

    setCurrentFileName(requestedFileName);
    isTransferringRef.current = true;

    setFileProgresses(prev => {
      const newMap = new Map(prev);
      const fileProgress = newMap.get(requestedFileName);
      if (fileProgress) {
        newMap.set(requestedFileName, {
          ...fileProgress,
          progress: 0,
          status: 'transferring',
          timeRemaining: ''
        });
      }
      return newMap;
    });

    const pc = await createPeerConnection();
    pcRef.current = pc;

    // 30초 타임아웃 (TURN 릴레이 협상 포함)
    const connectionTimeout = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
        setConnectionFailed(true);
        setStatus('waiting');
      }
    }, 30000);

    const dataChannel = pc.createDataChannel('file-transfer', {
      ordered: true
    });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      clearTimeout(connectionTimeout);
      setStatus('transferring');

      const metadata = JSON.stringify({
        type: 'file_metadata',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      dataChannel.send(metadata);

      sendFile(file, dataChannel);
    };

    dataChannel.onclose = () => {
      clearTimeout(connectionTimeout);
    };

    dataChannel.onerror = (error) => {
      console.error('[useP2PUploader] DataChannel error:', error);
      clearTimeout(connectionTimeout);
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
        setStatus('connected');

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
        setConnectionFailed(true);
        setStatus('waiting');
      }
      // 전송 중 disconnected는 일시적일 수 있으므로 에러 미표시
    };

    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode, sendFile]);

  useEffect(() => {
    if (!enabled || !shareCode || files.length === 0) {
      return;
    }

    isCleaningUpRef.current = false;

    const ws = createWebSocketConnection((message: SignalingMessage) => {
      handleSignalingMessage(message);
    });

    wsRef.current = ws;

    ws.onopen = () => {
      sendSignalingMessage(ws, {
        type: 'uploader_ready',
        share_code: shareCode,
        peer_id: peerIdRef.current,
        device_info: getDeviceInfo()
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (!isCleaningUpRef.current) {
        toast.error(t('p2p.connectionError'));
      }
    };

    ws.onclose = () => {
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const ws = wsRef.current;
      if (!ws) return;

      switch (message.type) {
        case 'peer_matched':
          setStatus('connected');
          if (message.device_info) {
            setPeerDeviceInfo(message.device_info);
          }

          if (message.file_name) {
            const pc = await setupPeerConnection(message.file_name);
            if (pc) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              sendSignalingMessage(ws, {
                type: 'offer',
                share_code: shareCode,
                sdp: offer.sdp,
                peer_id: peerIdRef.current
              });
            }
          } else if (files.length === 1) {
            const pc = await setupPeerConnection(files[0].name);
            if (pc) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              sendSignalingMessage(ws, {
                type: 'offer',
                share_code: shareCode,
                sdp: offer.sdp,
                peer_id: peerIdRef.current
              });
            }
          }
          break;

        case 'answer':
          if (message.sdp && pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: message.sdp
            }));
          }
          break;

        case 'ice_candidate':
          if (message.candidate && pcRef.current) {
            try {
              const candidate = JSON.parse(message.candidate);
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
            }
          }
          break;

        case 'downloader_arrived':
          if (!isTransferringRef.current) {
            setStatus('connected');
            if (message.device_info) {
              setPeerDeviceInfo(message.device_info);
            }
          }
          break;

        case 'downloader_offline':
          if (isTransferringRef.current) {
            toast.warning(t('p2p.receiverDisconnected'));
            isTransferringRef.current = false;
            setFileProgresses(prev => {
              const newMap = new Map(prev);
              newMap.forEach((progress, fileName) => {
                if (progress.status === 'transferring') {
                  newMap.set(fileName, {
                    ...progress,
                    progress: 0,
                    status: 'waiting',
                    timeRemaining: ''
                  });
                }
              });
              return newMap;
            });
          }
          setStatus('waiting');
          setCurrentFileName('');
          setPeerDeviceInfo(null);
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          if (!isCleaningUpRef.current && !message.message?.includes('not online')) {
            toast.error(message.message || t('p2p.connectionError'));
          }
          break;
      }
    };

    return () => {
      isCleaningUpRef.current = true;
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode, retryCount]);

  const retry = useCallback(() => {
    isCleaningUpRef.current = true;
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isCleaningUpRef.current = false;
    setConnectionFailed(false);
    setStatus('waiting');
    setPeerDeviceInfo(null);
    peerIdRef.current = generatePeerId();
    setRetryCount(prev => prev + 1);
  }, []);

  const cancelTransfer = useCallback((fileName: string) => {
    cancelledRef.current = true;
    isTransferringRef.current = false;

    if (wsRef.current) {
      sendSignalingMessage(wsRef.current, {
        type: 'uploader_cancelled',
        share_code: shareCode,
      });
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setFileProgresses(prev => {
      const newMap = new Map(prev);
      const fileProgress = newMap.get(fileName);
      if (fileProgress) {
        newMap.set(fileName, {
          ...fileProgress,
          progress: 0,
          status: 'cancelled',
          timeRemaining: ''
        });
      }
      return newMap;
    });

    setStatus('waiting');
    setCurrentFileName('');
    toast.info(t('p2p.transferCancelled'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode]);

  return { status, fileProgresses, currentFileName, peerDeviceInfo, connectionFailed, retry, cancelTransfer };
};
