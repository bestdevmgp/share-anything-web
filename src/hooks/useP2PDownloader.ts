import { useEffect, useRef, useState } from 'react';
import { SignalingMessage, FileInfo } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from '../context/ToastContext';

interface UseP2PDownloaderProps {
  shareCode: string;
  fileInfo: FileInfo;
  enabled: boolean;
  onComplete: (blob: Blob) => void;
}

export const useP2PDownloader = ({ shareCode, fileInfo, enabled, onComplete }: UseP2PDownloaderProps) => {
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'downloading' | 'completed' | 'error'>('waiting');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef<number>(0);
  const downloadStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo) {
      console.log('[useP2PDownloader] Not enabled or missing data:', { enabled, shareCode, hasFileInfo: !!fileInfo });
      return;
    }

    console.log('[useP2PDownloader] Setting up P2P connection for downloader');

    const setupP2PConnection = async () => {
      try {
        setStatus('connecting');

        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });

        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useP2PDownloader] WebSocket connected, sending downloader_join');
          sendSignalingMessage(ws, {
            type: 'downloader_join',
            share_code: shareCode,
            peer_id: peerIdRef.current
          });
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setStatus('error');
          toast.error('연결 오류가 발생했습니다.');
        };

        ws.onclose = (event) => {
          console.log('[useP2PDownloader] WebSocket closed - Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
          if (status !== 'completed') {
            console.log('[useP2PDownloader] WebSocket closed before completion');
          }
        };

        const pc = createPeerConnection();
        pcRef.current = pc;

        console.log('[useP2PDownloader] Registering event handlers...');

        let metadataReceived = false;
        let actualFileSize = fileInfo.file_size;
        let actualFileType = fileInfo.file_type;

        const formatTime = (seconds: number): string => {
          if (seconds < 60) return `${Math.ceil(seconds)}초`;
          if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${Math.ceil(seconds % 60)}초`;
          return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
        };

        pc.ondatachannel = (event) => {
          console.log('[useP2PDownloader] DataChannel received');
          const dataChannel = event.channel;

          dataChannel.onopen = () => {
            console.log('[useP2PDownloader] DataChannel opened');
            setStatus('downloading');
            downloadStartTimeRef.current = Date.now();
          };

          dataChannel.onclose = () => {
            console.log('[useP2PDownloader] DataChannel closed');
          };

          dataChannel.onmessage = (event) => {
            if (!metadataReceived && typeof event.data === 'string') {
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
              }
            }

            const chunk = event.data as ArrayBuffer;
            receivedChunksRef.current.push(chunk);
            receivedSizeRef.current += chunk.byteLength;

            const progressPercent = (receivedSizeRef.current / actualFileSize) * 100;
            setProgress(Math.round(progressPercent));

            const elapsedMs = Date.now() - downloadStartTimeRef.current;
            if (elapsedMs > 500 && receivedSizeRef.current > 0) {
              const bytesPerMs = receivedSizeRef.current / elapsedMs;
              const remainingBytes = actualFileSize - receivedSizeRef.current;
              const remainingSeconds = remainingBytes / bytesPerMs / 1000;
              setTimeRemaining(formatTime(remainingSeconds));
            }

            if (receivedSizeRef.current >= actualFileSize) {
              const blob = new Blob(receivedChunksRef.current, { type: actualFileType });
              setStatus('completed');
              setTimeRemaining('');
              onComplete(blob);

              if (wsRef.current) {
                sendSignalingMessage(wsRef.current, {
                  type: 'transfer_complete',
                  share_code: shareCode
                });
              }

              cleanup();
            }
          };

          dataChannel.onerror = (error) => {
            console.error('DataChannel error:', error);
            setStatus('error');
            toast.error('파일 수신 중 오류가 발생했습니다.');
          };
        };

        pc.onicecandidate = (event) => {
          console.log('[useP2PDownloader] onicecandidate event fired!', event.candidate ? 'Candidate found' : 'No more candidates');
          if (event.candidate && wsRef.current) {
            console.log('[useP2PDownloader] ICE candidate gathered:', event.candidate.type);
            sendSignalingMessage(wsRef.current, {
              type: 'ice_candidate',
              share_code: shareCode,
              candidate: JSON.stringify(event.candidate),
              sdp_mid: event.candidate.sdpMid,
              sdp_m_line_index: event.candidate.sdpMLineIndex,
              peer_id: peerIdRef.current
            });
          } else if (!event.candidate) {
            console.log('[useP2PDownloader] ICE gathering completed');
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log('[useP2PDownloader] onicegatheringstatechange event fired! New state:', pc.iceGatheringState);
        };

        console.log('[useP2PDownloader] Event handlers registered. Current state:', {
          signaling: pc.signalingState,
          iceGathering: pc.iceGatheringState,
          iceConnection: pc.iceConnectionState
        });

        pc.oniceconnectionstatechange = () => {
          console.log('[useP2PDownloader] ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[useP2PDownloader] ICE connection established');
            setStatus('downloading');
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[useP2PDownloader] ICE connection failed/disconnected');
            setStatus('error');
            toast.error('P2P 연결에 실패했습니다. 네트워크를 확인해주세요.');
          }
        };

      } catch (error) {
        console.error('Failed to setup P2P connection:', error);
        setStatus('error');
        toast.error('P2P 연결 설정에 실패했습니다.');
      }
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const pc = pcRef.current;
      const ws = wsRef.current;

      console.log('[useP2PDownloader] Received signaling message:', message.type);

      if (!pc || !ws) return;

      switch (message.type) {
        case 'peer_matched':
          console.log('[useP2PDownloader] Peer matched! Waiting for offer...');
          break;

        case 'offer':
          console.log('[useP2PDownloader] Received offer from uploader');
          if (message.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: message.sdp
            }));
            console.log('[useP2PDownloader] Remote description set (offer)');

            const answer = await pc.createAnswer();
            console.log('[useP2PDownloader] Answer SDP:', answer.sdp?.substring(0, 200) + '...');
            await pc.setLocalDescription(answer);
            console.log('[useP2PDownloader] Local description set (answer)');
            console.log('[useP2PDownloader] Current ICE gathering state after setLocalDescription:', pc.iceGatheringState);

            sendSignalingMessage(ws, {
              type: 'answer',
              share_code: shareCode,
              sdp: answer.sdp,
              peer_id: peerIdRef.current
            });
            console.log('[useP2PDownloader] Answer sent to uploader');
            console.log('[useP2PDownloader] Signaling state:', pc.signalingState);
            console.log('[useP2PDownloader] ICE gathering state:', pc.iceGatheringState);
            console.log('[useP2PDownloader] ICE connection state:', pc.iceConnectionState);
          }
          break;

        case 'ice_candidate':
          if (message.candidate) {
            try {
              const candidate = JSON.parse(message.candidate);
              console.log('[useP2PDownloader] Received ICE candidate:', candidate.type);
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('[useP2PDownloader] Failed to add ICE candidate:', err);
            }
          }
          break;

        case 'uploader_offline':
          setStatus('error');
          toast.error('업로더가 연결을 종료했습니다.');
          cleanup();
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          setStatus('error');
          toast.error(message.message || '연결 오류가 발생했습니다.');
          break;
      }
    };

    const cleanup = () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };

    setupP2PConnection();

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode]);

  return { status, progress, timeRemaining };
};
