import { useEffect, useRef, useState, useCallback } from 'react';
import { SignalingMessage } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from '../context/ToastContext';
import { getDeviceInfo } from '../utils/format';

interface FileProgress {
  fileName: string;
  progress: number;
  status: 'waiting' | 'transferring' | 'completed';
  timeRemaining: string;
}

interface UseP2PUploaderProps {
  shareCode: string;
  files: File[];
  enabled: boolean;
}

export const useP2PUploader = ({ shareCode, files, enabled }: UseP2PUploaderProps) => {
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
    if (seconds < 60) return `${Math.ceil(seconds)}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${Math.ceil(seconds % 60)}초`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return `${hours}시간 ${mins}분 ${secs}초`;
  }, []);

  const sendFile = useCallback((file: File, dataChannel: RTCDataChannel) => {
    const reader = new FileReader();
    const chunkSize = 16384;
    let offset = 0;
    transferStartTimeRef.current = Date.now();
    lastTimeUpdateRef.current = 0;

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

      toast.success(`${file.name} 전송 완료!`);

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
          console.log('[useP2PUploader] EOF marker sent, buffer drained');
        } catch (err) {
          console.warn('[useP2PUploader] Failed to send EOF marker:', err);
        }
        finishTransfer();
      } else {
        console.log('[useP2PUploader] Waiting for buffer to drain:', dataChannel.bufferedAmount);
        setTimeout(waitForBufferDrain, 50);
      }
    };

    reader.onload = (e) => {
      if (!e.target?.result) return;

      const buffer = e.target.result as ArrayBuffer;

      const sendChunk = () => {
        if (offset >= buffer.byteLength) {
          console.log('[useP2PUploader] All chunks queued, waiting for buffer drain...');
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

        const progressPercent = Math.min((offset / buffer.byteLength) * 100, 100);

        const now = Date.now();
        const elapsedMs = now - transferStartTimeRef.current;
        let timeRemainingStr = '';

        if (elapsedMs > 500 && offset > 0) {
          if (now - lastTimeUpdateRef.current >= 1000) {
            const bytesPerMs = offset / elapsedMs;
            const remainingBytes = buffer.byteLength - offset;
            const remainingSeconds = remainingBytes / bytesPerMs / 1000;
            timeRemainingStr = formatTime(remainingSeconds);
            lastTimeUpdateRef.current = now;
          }
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

        setTimeout(sendChunk, 0);
      };

      sendChunk();
    };

    reader.readAsArrayBuffer(file);
  }, [shareCode, formatTime]);

  const setupPeerConnection = useCallback((requestedFileName: string) => {
    const file = filesRef.current.find(f => f.name === requestedFileName);
    if (!file) {
      console.error('[useP2PUploader] Requested file not found:', requestedFileName);
      toast.error('요청된 파일을 찾을 수 없습니다.');
      return;
    }

    console.log('[useP2PUploader] Setting up peer connection for file:', requestedFileName);
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

    const pc = createPeerConnection();
    pcRef.current = pc;

    // Connection timeout - if not connected within 10 seconds, consider it failed
    const connectionTimeout = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
        console.log('[useP2PUploader] Connection timeout - ICE state:', pc.iceConnectionState);
        setConnectionFailed(true);
        setStatus('waiting');
      }
    }, 10000);

    const dataChannel = pc.createDataChannel('file-transfer', {
      ordered: true
    });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('[useP2PUploader] DataChannel opened for file:', requestedFileName);
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
      console.log('[useP2PUploader] DataChannel closed');
      clearTimeout(connectionTimeout);
    };

    dataChannel.onerror = (error) => {
      console.error('[useP2PUploader] DataChannel error:', error);
      clearTimeout(connectionTimeout);
      if (isTransferringRef.current) {
        toast.error('파일 전송 중 오류가 발생하였습니다.');
      }
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

    pc.oniceconnectionstatechange = () => {
      console.log('[useP2PUploader] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearTimeout(connectionTimeout);
        setStatus('connected');
        setConnectionFailed(false);
      } else if (pc.iceConnectionState === 'failed') {
        clearTimeout(connectionTimeout);
        console.log('[useP2PUploader] ICE connection failed');
        setConnectionFailed(true);
        setStatus('waiting');
      }
      // 'disconnected' state is often temporary during transfer, don't show error
    };

    return pc;
  }, [shareCode, sendFile]);

  useEffect(() => {
    if (!enabled || !shareCode || files.length === 0) {
      return;
    }

    console.log('[useP2PUploader] Setting up WebSocket connection');

    const ws = createWebSocketConnection((message: SignalingMessage) => {
      handleSignalingMessage(message);
    });

    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useP2PUploader] WebSocket connected, sending uploader_ready');
      sendSignalingMessage(ws, {
        type: 'uploader_ready',
        share_code: shareCode,
        peer_id: peerIdRef.current,
        device_info: getDeviceInfo()
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('연결 오류가 발생하였습니다.');
    };

    ws.onclose = (event) => {
      console.log('[useP2PUploader] WebSocket closed - Code:', event.code);
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const ws = wsRef.current;
      if (!ws) return;

      console.log('[useP2PUploader] Received signaling message:', message.type, message.file_name);

      switch (message.type) {
        case 'peer_matched':
          console.log('[useP2PUploader] Peer matched! Requested file:', message.file_name, 'Device:', message.device_info);
          setStatus('connected');
          if (message.device_info) {
            setPeerDeviceInfo(message.device_info);
          }

          if (message.file_name) {
            const pc = setupPeerConnection(message.file_name);
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
            const pc = setupPeerConnection(files[0].name);
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
          console.log('[useP2PUploader] Received answer from downloader');
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
            } catch (err) {
              console.warn('[useP2PUploader] Failed to add ICE candidate:', err);
            }
          }
          break;

        case 'downloader_offline':
          console.log('[useP2PUploader] Downloader went offline');
          if (isTransferringRef.current) {
            toast.warning('수신자가 연결을 종료하였습니다.');
            isTransferringRef.current = false;
          }
          setStatus('waiting');
          setCurrentFileName('');
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          toast.error(message.message || '연결 오류가 발생하였습니다.');
          break;
      }
    };

    return () => {
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

  // Retry timeout - if connection doesn't succeed within 10 seconds after retry, show failure
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (retryCount === 0) return; // Skip initial load

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    console.log('[useP2PUploader] Retry timeout started for attempt:', retryCount);
    retryTimeoutRef.current = setTimeout(() => {
      console.log('[useP2PUploader] Retry timeout fired, checking status...');
      setConnectionFailed(true);
    }, 10000);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [retryCount]);

  // Clear retry timeout when transfer actually starts
  useEffect(() => {
    const isTransferring = Array.from(fileProgresses.values()).some(
      fp => fp.status === 'transferring' || fp.status === 'completed'
    );
    if (isTransferring && retryTimeoutRef.current) {
      console.log('[useP2PUploader] Transfer started, clearing retry timeout');
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [fileProgresses]);

  const retry = useCallback(() => {
    console.log('[useP2PUploader] Retrying P2P connection...');
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
    setConnectionFailed(false);
    setStatus('waiting');
    setPeerDeviceInfo(null);
    peerIdRef.current = generatePeerId();
    setRetryCount(prev => prev + 1);
  }, []);

  return { status, fileProgresses, currentFileName, peerDeviceInfo, connectionFailed, retry };
};
