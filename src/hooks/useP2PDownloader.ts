import { useEffect, useRef, useState } from 'react';
import { SignalingMessage, FileInfo } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from 'react-toastify';

interface UseP2PDownloaderProps {
  shareCode: string;
  fileInfo: FileInfo;
  enabled: boolean;
  onComplete: (blob: Blob) => void;
}

export const useP2PDownloader = ({ shareCode, fileInfo, enabled, onComplete }: UseP2PDownloaderProps) => {
  const [status, setStatus] = useState<'waiting' | 'connecting' | 'downloading' | 'completed' | 'error'>('waiting');
  const [progress, setProgress] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const receivedSizeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !shareCode || !fileInfo) return;

    const setupP2PConnection = async () => {
      try {
        setStatus('connecting');

        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });

        wsRef.current = ws;

        ws.onopen = () => {
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

        ws.onclose = () => {
          if (status !== 'completed') {
            console.log('WebSocket closed');
          }
        };

        const pc = createPeerConnection();
        pcRef.current = pc;

        pc.ondatachannel = (event) => {
          const dataChannel = event.channel;

          dataChannel.onmessage = (event) => {
            const chunk = event.data as ArrayBuffer;
            receivedChunksRef.current.push(chunk);
            receivedSizeRef.current += chunk.byteLength;

            const progressPercent = (receivedSizeRef.current / fileInfo.file_size) * 100;
            setProgress(Math.round(progressPercent));

            if (receivedSizeRef.current >= fileInfo.file_size) {
              const blob = new Blob(receivedChunksRef.current, { type: fileInfo.file_type });
              setStatus('completed');
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
          if (pc.iceConnectionState === 'connected') {
            setStatus('downloading');
          } else if (pc.iceConnectionState === 'failed') {
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

      if (!pc || !ws) return;

      switch (message.type) {
        case 'peer_matched':
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendSignalingMessage(ws, {
            type: 'offer',
            share_code: shareCode,
            sdp: offer.sdp,
            peer_id: peerIdRef.current
          });
          break;

        case 'answer':
          if (message.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'answer',
              sdp: message.sdp
            }));
          }
          break;

        case 'ice_candidate':
          if (message.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(
              JSON.parse(message.candidate)
            ));
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
  }, [enabled, shareCode, fileInfo, onComplete, status]);

  return { status, progress };
};
