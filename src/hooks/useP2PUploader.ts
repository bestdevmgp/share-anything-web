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
  const [status, setStatus] = useState<'waiting' | 'connected' | 'transferring' | 'waiting_for_next' | 'completed'>('waiting');
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
  const lastProgressTickRef = useRef<number>(0);
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
    if (seconds < 60) return t('format.secondsRemaining', { seconds: Math.max(1, Math.ceil(seconds)) });
    if (seconds < 3600) return t('format.minutesSecondsRemaining', { minutes: Math.floor(seconds / 60), seconds: Math.ceil(seconds % 60) });
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.ceil(seconds % 60);
    return t('format.hoursMinutesSecondsRemaining', { hours, minutes: mins, seconds: secs });
  }, [t]);

  const sendFile = useCallback((file: File, dataChannel: RTCDataChannel) => {
    const chunkSize = 16 * 1024;
    const sliceSize = chunkSize * 32; // 2MB per disk read
    const BUFFER_HIGH = 4 * 1024 * 1024;
    const BUFFER_LOW = 1 * 1024 * 1024;
    dataChannel.bufferedAmountLowThreshold = BUFFER_LOW;
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

      // Session stays alive. The receiver will issue `file_request` for the
      // next file (handled in the WS message switch below) or
      // `transfer_complete` when finished — both reuse the OPEN PC+DC, so
      // we deliberately do NOT close anything here. Per-file teardown +
      // fresh ICE handshake was the old flow and cost 5–15s on TURN.
      setStatus('waiting_for_next');
      setCurrentFileName('');

      toast.success(t('p2p.transferComplete', { fileName: file.name }));
    };

    const sendEofAndFinish = () => {
      try {
        dataChannel.send('__EOF__');
      } catch {
      }
      finishTransfer();
    };

    // `onbufferedamountlow` is supposed to wake us when the channel drains, but the
    // callback is *single-shot* and on some browsers / TURN paths it occasionally
    // doesn't fire when expected (e.g. when bytes are still in-flight on the TURN
    // relay). A short polling timer as a backstop guarantees the send loop resumes
    // and the progress UI stays live while we wait.
    const armDrainWait = (threshold: number, onDrain: () => void) => {
      let done = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      const finish = () => {
        if (done) return;
        done = true;
        dataChannel.onbufferedamountlow = null;
        if (timer) clearInterval(timer);
        onDrain();
      };
      dataChannel.onbufferedamountlow = finish;
      timer = setInterval(() => {
        if (cancelledRef.current) {
          done = true;
          dataChannel.onbufferedamountlow = null;
          if (timer) clearInterval(timer);
          return;
        }
        // Refresh the progress UI even while we're stalled on the buffer; the
        // wire-position calculation moves forward as bytes leave the channel.
        flushProgress();
        if (dataChannel.bufferedAmount <= threshold) finish();
      }, 200);
    };

    let flushProgress = () => {};

    const waitForBufferDrain = () => {
      if (dataChannel.bufferedAmount === 0) {
        sendEofAndFinish();
        return;
      }
      dataChannel.bufferedAmountLowThreshold = 0;
      armDrainWait(0, sendEofAndFinish);
    };

    const readNextSlice = () => {
      if (cancelledRef.current) return;
      if (offset >= file.size) {
        waitForBufferDrain();
        return;
      }

      const slice = file.slice(offset, Math.min(offset + sliceSize, file.size));
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return;
        const buffer = e.target.result as ArrayBuffer;
        let bufferOffset = 0;

        const updateProgress = () => {
          const now = Date.now();
          // The receiver pushes per-chunk progress to its UI (every few tens of
          // milliseconds), so a 1-second sender tick lags far behind and
          // produces the visible "sender suddenly jumps then sits frozen"
          // effect. Refresh the bar every 200 ms but keep ETA recomputation on
          // a 1-second cadence (short-window estimates jitter wildly).
          if (now - lastProgressTickRef.current < 200) return;
          lastProgressTickRef.current = now;

          // Report bytes that have actually left the local DC buffer (≈ bytes on
          // the wire) instead of bytes we've pushed in. On TURN relays push
          // races way ahead of wire and the bar would otherwise jump to 100%
          // while the receiver sits at 30% — and the *sender* would appear
          // frozen at a fixed % while the buffer drains.
          const onWire = Math.max(0, offset - dataChannel.bufferedAmount);
          const progressPercent = Math.min((onWire / file.size) * 100, 100);
          const elapsedMs = now - transferStartTimeRef.current;
          let recomputedTimeRemaining: string | undefined;

          if (now - lastTimeUpdateRef.current >= 1000) {
            if (elapsedMs >= 2000 && onWire >= file.size * 0.02) {
              const bytesPerMs = onWire / elapsedMs;
              const remainingBytes = file.size - onWire;
              const remainingSeconds = remainingBytes / bytesPerMs / 1000;
              recomputedTimeRemaining = formatTime(remainingSeconds);
            }
            lastTimeUpdateRef.current = now;
          }

          setFileProgresses(prev => {
            const newMap = new Map(prev);
            const fileProgress = newMap.get(file.name);
            if (fileProgress) {
              newMap.set(file.name, {
                ...fileProgress,
                progress: Math.round(progressPercent),
                status: 'transferring',
                timeRemaining: recomputedTimeRemaining ?? fileProgress.timeRemaining
              });
            }
            return newMap;
          });
        };
        flushProgress = updateProgress;

        const sendChunks = () => {
          while (bufferOffset < buffer.byteLength) {
            if (cancelledRef.current) return;

            if (dataChannel.bufferedAmount > BUFFER_HIGH) {
              updateProgress();
              armDrainWait(BUFFER_LOW, sendChunks);
              return;
            }

            const end = Math.min(bufferOffset + chunkSize, buffer.byteLength);
            const chunk = buffer.slice(bufferOffset, end);
            dataChannel.send(chunk);
            offset += chunk.byteLength;
            bufferOffset += chunk.byteLength;
          }

          updateProgress();
          readNextSlice();
        };

        sendChunks();
      };
      reader.readAsArrayBuffer(slice);
    };

    readNextSlice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareCode, formatTime]);

  // Stream a file on the ALREADY-open DataChannel. Used for every file after
  // the first one — the PC + DC + ICE state are reused from the initial
  // PeerMatched setup, so all that's required per file is metadata + chunks
  // + EOF on the existing channel.
  const sendOnExistingChannel = useCallback((requestedFileName: string) => {
    const file = filesRef.current.find(f => f.name === requestedFileName);
    if (!file) {
      console.error('[useP2PUploader] Requested file not found:', requestedFileName);
      toast.error(t('p2p.fileNotFound'));
      return;
    }
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      console.error('[useP2PUploader] DataChannel not open for next file');
      return;
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
    setStatus('transferring');

    const metadata = JSON.stringify({
      type: 'file_metadata',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    dc.send(metadata);
    sendFile(file, dc);
  }, [sendFile, t]);

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

    let turnFallbackToastShown = false;
    pc.oniceconnectionstatechange = async () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        clearTimeout(connectionTimeout);
        setStatus('connected');

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
          } catch {
          }
        }
      } else if (pc.iceConnectionState === 'failed') {
        clearTimeout(connectionTimeout);
        setConnectionFailed(true);
        setStatus('waiting');
      }
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

    const keepaliveInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendSignalingMessage(ws, { type: 'ping' });
      }
    }, 30000);

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const ws = wsRef.current;
      if (!ws) return;

      switch (message.type) {
        case 'peer_matched':
          setStatus('connected');
          if (message.device_info) {
            setPeerDeviceInfo(message.device_info);
          }

          // Only set up PC/DC + ICE on the FIRST PeerMatched. Subsequent files
          // arrive via `file_request` over the existing channel. If a stale or
          // duplicate PeerMatched arrives (e.g. legacy receiver that creates a
          // fresh WS per file) we ignore it — the existing PC keeps serving.
          if (pcRef.current) {
            break;
          }

          {
            const fileName = message.file_name || (files.length === 1 ? files[0]?.name : undefined);
            if (fileName) {
              const pc = await setupPeerConnection(fileName);
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
          }
          break;

        case 'file_request':
          if (message.file_name) {
            sendOnExistingChannel(message.file_name);
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

        case 'transfer_complete':
          isCleaningUpRef.current = true;
          setStatus('completed');
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
      clearInterval(keepaliveInterval);
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
