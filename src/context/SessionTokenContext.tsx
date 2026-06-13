import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { authAPI, setSessionToken, markTokenUnavailable } from '../services/api';
import TurnstileBlockedOverlay from '../components/TurnstileBlockedOverlay';

type Status = 'idle' | 'minting' | 'ready' | 'failed';

interface Ctx {
  status: Status;
  expiresAt: string | null;
  retry: () => void;
}

const SessionTokenContext = createContext<Ctx | null>(null);

export const useSessionToken = (): Ctx => {
  const ctx = useContext(SessionTokenContext);
  return ctx ?? { status: 'idle', expiresAt: null, retry: () => {} };
};

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const REFRESH_LEAD_MS = 60_000;
const MAX_RETRIES = 3;
const LOAD_TIMEOUT_MS = 12_000;
const BACKEND_RETRY_MS = 30_000;

export const SessionTokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const widgetRef = useRef<TurnstileInstance>(null);
  const interactiveRef = useRef<TurnstileInstance>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const widgetSolvedRef = useRef(false);
  const lastResetRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  statusRef.current = status;

  const markFailed = useCallback(() => {
    setStatus('failed');
    markTokenUnavailable(true);
  }, []);

  const forceRefresh = useCallback(() => {
    if (statusRef.current === 'failed') return;
    const now = Date.now();
    if (now - lastResetRef.current < 2000) return;
    lastResetRef.current = now;
    setStatus('minting');
    widgetRef.current?.reset();
  }, []);

  const markUnreachable = useCallback(() => {
    markTokenUnavailable(true);
    attemptsRef.current = 0;
    setStatus('idle');
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(forceRefresh, BACKEND_RETRY_MS);
  }, [forceRefresh]);

  const armLoadTimeout = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      if (!widgetSolvedRef.current) markFailed();
    }, LOAD_TIMEOUT_MS);
  }, [markFailed]);

  const retry = useCallback(() => {
    markTokenUnavailable(false);
    attemptsRef.current = 0;
    lastResetRef.current = Date.now();
    interactiveRef.current?.reset();
  }, []);

  const scheduleRefresh = useCallback((expIso: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const ms = new Date(expIso).getTime() - Date.now() - REFRESH_LEAD_MS;
    if (ms <= 0) {
      forceRefresh();
      return;
    }
    refreshTimerRef.current = setTimeout(forceRefresh, ms);
  }, [forceRefresh]);

  const onTurnstileSuccess = useCallback(async (turnstileToken: string) => {
    widgetSolvedRef.current = true;
    setStatus('minting');
    try {
      const { session_token, expires_at } = await authAPI.exchangeSessionToken(turnstileToken);
      setSessionToken(session_token);
      setExpiresAt(expires_at);
      setStatus('ready');
      attemptsRef.current = 0;
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      scheduleRefresh(expires_at);
    } catch (err: any) {
      console.warn('[SessionToken] exchange failed', err);
      attemptsRef.current += 1;
      if (attemptsRef.current < MAX_RETRIES) {
        setTimeout(forceRefresh, 1000 * attemptsRef.current);
        return;
      }
      const httpStatus = err?.response?.status;
      const tokenRejected = httpStatus === 400 || httpStatus === 401 || httpStatus === 403;
      if (tokenRejected) {
        markFailed();
      } else {
        markUnreachable();
      }
    }
  }, [scheduleRefresh, forceRefresh, markFailed, markUnreachable]);

  const onTurnstileError = useCallback(() => {
    attemptsRef.current += 1;
    console.warn('[SessionToken] Turnstile error');
    if (attemptsRef.current >= MAX_RETRIES) markFailed();
  }, [markFailed]);

  const onInteractiveError = useCallback(() => {
    console.warn('[SessionToken] interactive Turnstile error');
  }, []);

  useEffect(() => {
    armLoadTimeout();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [armLoadTimeout]);

  useEffect(() => {
    const handler = () => forceRefresh();
    window.addEventListener('session-token:force-refresh', handler);
    return () => window.removeEventListener('session-token:force-refresh', handler);
  }, [forceRefresh]);

  useEffect(() => {
    if (status === 'failed') {
      setOverlayClosing(false);
      setOverlayMounted(true);
      return;
    }
    if ((status === 'ready' || status === 'idle') && overlayMounted) {
      setOverlayClosing(true);
      const timer = setTimeout(() => {
        setOverlayMounted(false);
        setOverlayClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [status, overlayMounted]);

  if (!SITE_KEY) {
    console.error('[SessionToken] REACT_APP_TURNSTILE_SITE_KEY is not defined');
    return <>{children}</>;
  }

  return (
    <SessionTokenContext.Provider value={{ status, expiresAt, retry }}>
      <div
        style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1, overflow: 'hidden' }}
        aria-hidden
      >
        <Turnstile
          ref={widgetRef}
          siteKey={SITE_KEY}
          onSuccess={onTurnstileSuccess}
          onError={onTurnstileError}
          onExpire={forceRefresh}
          options={{ size: 'invisible', action: 'session' }}
        />
      </div>
      {children}
      {overlayMounted && (
        <TurnstileBlockedOverlay onRetry={retry} closing={overlayClosing}>
          <Turnstile
            ref={interactiveRef}
            siteKey={SITE_KEY}
            onSuccess={onTurnstileSuccess}
            onError={onInteractiveError}
            options={{ size: 'flexible', action: 'session' }}
          />
        </TurnstileBlockedOverlay>
      )}
    </SessionTokenContext.Provider>
  );
};
