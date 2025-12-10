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
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
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
