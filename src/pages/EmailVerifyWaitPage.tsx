import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import CodeInput from '../components/CodeInput';
import AnimatedHeight from '../components/UnifiedFileBox/AnimatedHeight';
import { EnvelopeIcon, ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline';
import { providerLogoMap } from '../utils/providerLogos';
import type { User } from '../types';

const SESSION_STORAGE_KEY = 'emailAuthSession';
const EMAIL_AUTH_CHANNEL = 'email-auth-channel';

const EmailVerifyWaitPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const stateEmail = (location.state as any)?.email;
  const stateSessionId = (location.state as any)?.sessionId;

  const [email] = useState<string>(() => {
    if (stateEmail) return stateEmail;
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved).email || '';
    } catch {}
    return '';
  });

  const [sessionId] = useState<string>(() => {
    if (stateSessionId) return stateSessionId;
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved).sessionId || '';
    } catch {}
    return '';
  });

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [mergeInfo, setMergeInfo] = useState<{
    user: User;
    existingProvider: string;
  } | null>(null);

  const hasLoggedIn = useRef(false);

  useEffect(() => {
    document.title = t('emailAuth.checkEmail');
  }, [t]);

  useEffect(() => {
    if (email && sessionId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email, sessionId }));
    }
  }, [email, sessionId]);

  useEffect(() => {
    if (!email || !sessionId) {
      navigate('/signin', { replace: true });
    }
  }, [email, sessionId, navigate]);

  const handleLoginSuccess = useCallback((user: User, existingProvider?: string) => {
    if (hasLoggedIn.current) return;
    if (existingProvider) {
      setMergeInfo({ user, existingProvider });
      return;
    }
    hasLoggedIn.current = true;
    localStorage.removeItem('emailAuthDeviceId');
    localStorage.setItem('lastLoginProvider', 'email');
    login(user);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    toast.success(t('oauth.loginSuccess'));
    const cliRedirect = localStorage.getItem('cli_signin_redirect');
    if (cliRedirect) {
      localStorage.removeItem('cli_signin_redirect');
      navigate(cliRedirect, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [login, navigate, t]);

  useEffect(() => {
    if (!sessionId || hasLoggedIn.current || mergeInfo) return;

    const interval = setInterval(async () => {
      try {
        const data = await authAPI.checkEmailAuthStatus(sessionId);
        if (data.status === 'completed' && data.auth) {
          handleLoginSuccess(data.auth.user, data.auth.existing_provider);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, mergeInfo, handleLoginSuccess]);

  useEffect(() => {
    if (hasLoggedIn.current || mergeInfo) return;

    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(EMAIL_AUTH_CHANNEL);
      channel.onmessage = (e) => {
        if (e.data?.type === 'email-auth-complete' && e.data.auth) {
          channel.postMessage({ type: 'auth-received' });
          handleLoginSuccess(e.data.auth.user, e.data.auth.existing_provider);
        }
      };
    } catch {
      return;
    }

    return () => channel.close();
  }, [mergeInfo, handleLoginSuccess]);

  const handleVerifyCode = async (value?: string) => {
    const target = value ?? code;
    if (target.length !== 6 || verifying) return;
    setCodeError('');
    setVerifying(true);
    try {
      const data = await authAPI.verifyEmailCode(sessionId, target);
      handleLoginSuccess(data.user, data.existing_provider);
    } catch {
      setCodeError(t('emailAuth.verifyFailed'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => {
    navigate('/signin', { state: { email } });
  };

  const handleMergeContinue = () => {
    if (!mergeInfo || hasLoggedIn.current) return;
    hasLoggedIn.current = true;
    localStorage.removeItem('emailAuthDeviceId');
    localStorage.setItem('lastLoginProvider', 'email');
    login(mergeInfo.user);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    toast.success(t('oauth.loginSuccess'));
    navigate('/', { replace: true });
  };

  if (mergeInfo) {
    const ProviderLogo = providerLogoMap[mergeInfo.existingProvider];
    const providerName = t(`emailAuth.providerName.${mergeInfo.existingProvider}`);

    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <Card className="rounded-3xl border-2 p-10">
            <CardContent className="p-0">
              <div className="flex items-center justify-center gap-3 mb-6">
                {ProviderLogo && (
                  <div className={`rounded-full flex items-center justify-center ${
                    ({
                      google: 'w-14 h-14 bg-[#F2F2F2] dark:bg-[#131314]',
                      naver: 'w-14 h-14 bg-[#03C75A]',
                      kakao: 'w-14 h-14 bg-[#FEE500]',
                      apple: 'w-14 h-14 bg-black dark:bg-white text-white dark:text-black',
                    } as Record<string, string>)[mergeInfo.existingProvider] || 'w-14 h-14 bg-muted'
                  }`}>
                    <ProviderLogo className={
                      mergeInfo.existingProvider === 'google' ? 'w-7 h-7' :
                      mergeInfo.existingProvider === 'kakao' ? 'w-7 h-7' :
                      mergeInfo.existingProvider === 'apple' ? 'w-7 h-7' : 'w-5 h-5'
                    } />
                  </div>
                )}
                <LinkIcon className="w-5 h-5 text-muted-foreground" />
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <EnvelopeIcon className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground text-center mb-3">
                {t('emailAuth.accountMergeTitle')}
              </h2>
              <p className="text-muted-foreground text-sm text-center mb-8">
                {t('emailAuth.accountMergeMessage', { provider: providerName })}
              </p>

              <Button
                onClick={handleMergeContinue}
                size="xl"
                className="w-full"
              >
                {t('emailAuth.continue')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <Card className="rounded-3xl border-2 pt-10 px-10 pb-9">
          <CardContent className="p-0">
            <button
              onClick={() => navigate('/signin')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-foreground active:bg-accent active:text-foreground transition-colors mb-6 -ml-2 px-2 py-1.5 rounded-md"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {t('emailAuth.backToLogin')}
            </button>

            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <EnvelopeIcon className="w-9 h-9 text-primary" strokeWidth={2} />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              {t('emailAuth.checkEmail')}
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-1">
              {t('emailAuth.checkEmailDesc', { email })}
            </p>
            <p className="text-xs text-muted-foreground/70 text-center mb-8">
              {t('emailAuth.linkExpiresNotice')}
            </p>

            <AnimatedHeight>
              {showCodeInput ? (
                <div className="pb-6 animate-in fade-in-0 duration-300 delay-150 fill-mode-backwards">
                  <CodeInput
                    onChange={(val) => {
                      setCode(val);
                      setCodeError('');
                    }}
                    onComplete={(val) => handleVerifyCode(val)}
                    disabled={verifying}
                    ariaLabel={t('emailAuth.codePlaceholder')}
                  />
                  {codeError && (
                    <p className="text-sm text-destructive text-center mt-3">{codeError}</p>
                  )}
                  <Button
                    onClick={() => handleVerifyCode()}
                    disabled={code.length !== 6 || verifying}
                    size="xl"
                    className="w-full mt-6"
                  >
                    {verifying ? <Spinner size="sm" className="text-primary-foreground" /> : t('emailAuth.verify')}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center pb-3">
                  {t('emailAuth.otherBrowser')}{' '}
                  <button
                    onClick={() => setShowCodeInput(true)}
                    className="text-foreground underline can-hover:hover:text-foreground/80 active:text-foreground/80"
                  >
                    {t('emailAuth.enterCode')}
                  </button>
                </p>
              )}
            </AnimatedHeight>

            <p className="text-sm text-muted-foreground text-center">
              {t('emailAuth.notSeeingEmail')}{' '}
              <button
                onClick={handleResend}
                className="text-foreground underline can-hover:hover:text-foreground/80 active:text-foreground/80"
              >
                {t('emailAuth.trySendingAgain')}
              </button>
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerifyWaitPage;
