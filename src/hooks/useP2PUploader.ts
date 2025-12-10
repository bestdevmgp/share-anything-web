import { useEffect, useRef, useState } from 'react';
import { SignalingMessage } from '../types';
import { createWebSocketConnection, createPeerConnection, generatePeerId, sendSignalingMessage } from '../utils/webrtc';
import { toast } from 'react-toastify';

interface UseP2PUploaderProps {
  shareCode: string;
  file: File;
  enabled: boolean;
}

export const useP2PUploader = ({ shareCode, file, enabled }: UseP2PUploaderProps) => {
  const [status, setStatus] = useState<'waiting' | 'connected' | 'transferring' | 'completed'>('waiting');
  const [progress, setProgress] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerIdRef = useRef<string>(generatePeerId());

  useEffect(() => {
    if (!enabled || !shareCode || !file) return;

    const setupP2PConnection = async () => {
      try {
        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });

        wsRef.current = ws;

        ws.onopen = () => {
          sendSignalingMessage(ws, {
            type: 'uploader_ready',
            share_code: shareCode,
            peer_id: peerIdRef.current
          });
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('연결 오류가 발생했습니다.');
        };

        ws.onclose = () => {
          if (status !== 'completed') {
            console.log('WebSocket closed');
          }
        };

        const pc = createPeerConnection();
        pcRef.current = pc;

        const dataChannel = pc.createDataChannel('file-transfer', {
          ordered: true
        });
        dataChannelRef.current = dataChannel;

        dataChannel.onopen = () => {
          setStatus('transferring');
          sendFile(file, dataChannel);
        };

        dataChannel.onerror = (error) => {
          console.error('DataChannel error:', error);
          toast.error('파일 전송 중 오류가 발생했습니다.');
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
          if (pc.iceConnectionState === 'failed') {
            toast.error('P2P 연결에 실패했습니다. 네트워크를 확인해주세요.');
          }
        };

      } catch (error) {
        console.error('Failed to setup P2P connection:', error);
        toast.error('P2P 연결 설정에 실패했습니다.');
      }
    };

    const handleSignalingMessage = async (message: SignalingMessage) => {
      const pc = pcRef.current;
      const ws = wsRef.current;

      if (!pc || !ws) return;

      switch (message.type) {
        case 'peer_matched':
          setStatus('connected');
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
            await pc.addIceCandidate(new RTCIceCandidate(
              JSON.parse(message.candidate)
            ));
          }
          break;

        case 'error':
          console.error('Signaling error:', message.message);
          toast.error(message.message || '연결 오류가 발생했습니다.');
          break;
      }
    };

    const sendFile = (file: File, dataChannel: RTCDataChannel) => {
      const reader = new FileReader();
      const chunkSize = 16384;
      let offset = 0;

      reader.onload = (e) => {
        if (!e.target?.result) return;

        const buffer = e.target.result as ArrayBuffer;

        const sendChunk = () => {
          if (offset >= buffer.byteLength) {
            setStatus('completed');
            setProgress(100);

            if (wsRef.current) {
              sendSignalingMessage(wsRef.current, {
                type: 'transfer_complete',
                share_code: shareCode
              });
            }

            toast.success('파일 전송이 완료되었습니다!');
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
          setProgress(Math.round(progressPercent));

          setTimeout(sendChunk, 0);
        };

        sendChunk();
      };

      reader.readAsArrayBuffer(file);
    };

    setupP2PConnection();

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
  }, [enabled, shareCode, file, status]);

  return { status, progress };
};
