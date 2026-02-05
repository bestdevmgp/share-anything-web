import { SignalingMessage, IceServer } from '../types';
import { turnAPI } from '../services/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

// Cache for ICE servers to avoid repeated API calls
let cachedIceServers: RTCIceServer[] | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours (credentials valid for 24 hours)

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

// Convert API response to RTCIceServer format
const convertToRTCIceServers = (servers: IceServer[]): RTCIceServer[] => {
  return servers.map(server => ({
    urls: server.urls,
    username: server.username,
    credential: server.credential
  }));
};

// Fallback ICE servers (Google STUN only - no TURN)
const getFallbackIceServers = (): RTCIceServer[] => {
  console.warn('[WebRTC] Using fallback STUN servers (no TURN)');
  return [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];
};

// Fetch ICE servers from backend (with caching)
export const getIceServers = async (): Promise<RTCIceServer[]> => {
  const now = Date.now();

  // Return cached servers if still valid
  if (cachedIceServers && now < cacheExpiry) {
    console.log('[WebRTC] Using cached ICE servers');
    return cachedIceServers;
  }

  try {
    console.log('[WebRTC] Fetching TURN credentials from server...');
    const response = await turnAPI.getCredentials();
    cachedIceServers = convertToRTCIceServers(response.ice_servers);
    cacheExpiry = now + CACHE_DURATION_MS;
    console.log('[WebRTC] TURN credentials fetched successfully:', cachedIceServers.length, 'servers');
    return cachedIceServers;
  } catch (error) {
    console.error('[WebRTC] Failed to fetch TURN credentials:', error);
    return getFallbackIceServers();
  }
};

// Clear cached credentials (useful when refreshing)
export const clearIceServerCache = (): void => {
  cachedIceServers = null;
  cacheExpiry = 0;
};

export const createPeerConnection = async (): Promise<RTCPeerConnection> => {
  console.log('[WebRTC] Creating PeerConnection with Cloudflare TURN servers...');

  const iceServers = await getIceServers();

  const config: RTCConfiguration = {
    iceServers,
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
