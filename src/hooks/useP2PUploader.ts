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
    if (!enabled || !shareCode || !file) {
      console.log('[useP2PUploader] Not enabled or missing data:', { enabled, shareCode, hasFile: !!file });
      return;
    }

    console.log('[useP2PUploader] Setting up P2P connection for uploader');

    const setupP2PConnection = async () => {
      try {
        const ws = createWebSocketConnection((message: SignalingMessage) => {
          handleSignalingMessage(message);
        });

        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useP2PUploader] WebSocket connected, sending uploader_ready');
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
          console.log('[useP2PUploader] DataChannel opened');
          setStatus('transferring');
          sendFile(file, dataChannel);
        };

        dataChannel.onclose = () => {
          console.log('[useP2PUploader] DataChannel closed');
        };

        dataChannel.onerror = (error) => {
          console.error('[useP2PUploader] DataChannel error:', error);
          toast.error('파일 전송 중 오류가 발생했습니다.');
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && wsRef.current) {
            console.log('[useP2PUploader] ICE candidate gathered:', event.candidate.type);
            sendSignalingMessage(wsRef.current, {
              type: 'ice_candidate',
              share_code: shareCode,
              candidate: JSON.stringify(event.candidate),
              sdp_mid: event.candidate.sdpMid,
              sdp_m_line_index: event.candidate.sdpMLineIndex,
              peer_id: peerIdRef.current
            });
          } else if (!event.candidate) {
            console.log('[useP2PUploader] ICE gathering completed');
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log('[useP2PUploader] ICE gathering state:', pc.iceGatheringState);
        };

        pc.oniceconnectionstatechange = () => {
          console.log('[useP2PUploader] ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('[useP2PUploader] ICE connection established');
            setStatus('connected');
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[useP2PUploader] ICE connection failed/disconnected');
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

      console.log('[useP2PUploader] Received signaling message:', message.type);

      if (!pc || !ws) return;

      switch (message.type) {
        case 'peer_matched':
          console.log('[useP2PUploader] Peer matched!');
          setStatus('connected');
          break;

        case 'offer':
          console.log('[useP2PUploader] Received offer from downloader');
          if (message.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: 'offer',
              sdp: message.sdp
            }));
            console.log('[useP2PUploader] Remote description set (offer)');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[useP2PUploader] Local description set (answer)');

            sendSignalingMessage(ws, {
              type: 'answer',
              share_code: shareCode,
              sdp: answer.sdp,
              peer_id: peerIdRef.current
            });
            console.log('[useP2PUploader] Answer sent to downloader');
          }
          break;

        case 'ice_candidate':
          if (message.candidate) {
            const candidate = JSON.parse(message.candidate);
            console.log('[useP2PUploader] Received ICE candidate:', candidate.type);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shareCode]);

  return { status, progress };
};
