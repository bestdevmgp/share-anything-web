import { SignalingMessage, IceServer } from '../types';
import { turnAPI } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

let cachedIceServers: RTCIceServer[] | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12시간 (자격증명 유효기간 24시간)

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

const convertToRTCIceServers = (servers: IceServer[]): RTCIceServer[] => {
  return servers.map(server => ({
    urls: server.urls,
    username: server.username,
    credential: server.credential
  }));
};

const getFallbackIceServers = (): RTCIceServer[] => {
  return [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];
};

export const getIceServers = async (): Promise<RTCIceServer[]> => {
  const now = Date.now();

  if (cachedIceServers && now < cacheExpiry) {
    return cachedIceServers;
  }

  try {
    const response = await turnAPI.getCredentials();
    cachedIceServers = convertToRTCIceServers(response.ice_servers);
    cacheExpiry = now + CACHE_DURATION_MS;
    return cachedIceServers;
  } catch (error) {
    console.error('[WebRTC] Failed to fetch TURN credentials:', error);
    return getFallbackIceServers();
  }
};

export const createPeerConnection = async (): Promise<RTCPeerConnection> => {
  const iceServers = await getIceServers();

  const config: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  return new RTCPeerConnection(config);
};

export const generatePeerId = (): string => {
  return crypto.randomUUID();
};

export const sendSignalingMessage = (ws: WebSocket, message: SignalingMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};
