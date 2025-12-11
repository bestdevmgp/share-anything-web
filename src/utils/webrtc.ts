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
  return new RTCPeerConnection({
    iceServers: [
      // STUN 서버 (공인 IP 확인용)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },

      // TURN 서버 (NAT 통과용 - Metered.ca OpenRelay)
      {
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:80?transport=tcp',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  });
};

export const generatePeerId = (): string => {
  return crypto.randomUUID();
};

export const sendSignalingMessage = (ws: WebSocket, message: SignalingMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};
