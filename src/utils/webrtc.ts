import { SignalingMessage } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

export const createWebSocketConnection = (onMessage: (message: SignalingMessage) => void): WebSocket => {
  const ws = new WebSocket(`${WS_URL}/ws/signaling`);

  ws.onmessage = (event) => {
    try {
      const message: SignalingMessage = JSON.parse(event.data);
      onMessage(message);
    } catch (err) {
      console.error('Failed to parse signaling message:', err);
    }
  };

  return ws;
};

export const createPeerConnection = (): RTCPeerConnection => {
  console.log('[WebRTC] Creating PeerConnection with STUN/TURN servers...');

  const config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:80?transport=tcp',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      // Backup TURN servers
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  const pc = new RTCPeerConnection(config);

  console.log('[WebRTC] PeerConnection created:', {
    signalingState: pc.signalingState,
    iceGatheringState: pc.iceGatheringState,
    iceConnectionState: pc.iceConnectionState
  });

  return pc;
};

export const generatePeerId = (): string => {
  return crypto.randomUUID();
};

export const sendSignalingMessage = (ws: WebSocket, message: SignalingMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('[WebRTC] Sending signaling message:', message.type, 'to share_code:', message.share_code);
    ws.send(JSON.stringify(message));
  } else {
    console.error('[WebRTC] Cannot send message - WebSocket not open. State:', ws.readyState, 'Message type:', message.type);
  }
};
