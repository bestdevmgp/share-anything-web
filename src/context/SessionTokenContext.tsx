import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { authAPI, setSessionToken } from '../services/api';

type Status = 'idle' | 'minting' | 'ready' | 'failed';

interface Ctx {
  status: Status;
  expiresAt: string | null;
}

const SessionTokenContext = createContext<Ctx | null>(null);

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
const REFRESH_LEAD_MS = 60_000;
const MAX_RETRIES = 3;

export const SessionTokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const widgetRef = useRef<TurnstileInstance>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const forceRefresh = useCallback(() => {
    setStatus('minting');
    widgetRef.current?.reset();
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
    setStatus('minting');
    try {
      const { session_token, expires_at } = await authAPI.exchangeSessionToken(turnstileToken);
      setSessionToken(session_token);
      setExpiresAt(expires_at);
      setStatus('ready');
      attemptsRef.current = 0;
      scheduleRefresh(expires_at);
    } catch (err) {
      console.warn('[SessionToken] exchange failed', err);
      attemptsRef.current += 1;
      if (attemptsRef.current < MAX_RETRIES) {
        setTimeout(forceRefresh, 1000 * attemptsRef.current);
      } else {
        setStatus('failed');
      }
    }
  }, [scheduleRefresh, forceRefresh]);

  const onTurnstileError = useCallback(() => {
    attemptsRef.current += 1;
    console.warn('[SessionToken] Turnstile error');
    if (attemptsRef.current >= MAX_RETRIES) setStatus('failed');
  }, []);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  useEffect(() => {
    const handler = () => forceRefresh();
    window.addEventListener('session-token:force-refresh', handler);
    return () => window.removeEventListener('session-token:force-refresh', handler);
  }, [forceRefresh]);

  if (!SITE_KEY) {
    console.error('[SessionToken] REACT_APP_TURNSTILE_SITE_KEY is not defined');
    return <>{children}</>;
  }

  return (
    <SessionTokenContext.Provider value={{ status, expiresAt }}>
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
          options={{ size: 'invisible' }}
        />
      </div>
      {children}
    </SessionTokenContext.Provider>
  );
};
