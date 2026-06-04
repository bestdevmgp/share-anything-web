import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import StatusIcon from '../components/StatusIcon';
import { DevicePhoneMobileIcon, ClipboardDocumentIcon, CheckIcon, EnvelopeIcon, LinkIcon } from '@heroicons/react/24/outline';
import { providerLogoMap } from '../utils/providerLogos';
import { consumePostLoginRedirect } from '../utils/postLoginRedirect';
import type { User } from '../types';

const EMAIL_AUTH_CHANNEL = 'email-auth-channel';

const EmailMagicLinkCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [mergeInfo, setMergeInfo] = useState<{
    token: string;
    user: User;
    existingProvider: string;
  } | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    token: string;
    user: User;
  } | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    document.title = t('emailAuth.verificationCode');
  }, [t]);

  useEffect(() => {
    const verifyToken = async () => {
      const hash = window.location.hash;
      const token = hash.startsWith('#') ? hash.slice(1) : '';
      if (!token) {
        setError(t('oauth.invalidRequest'));
        setTimeout(() => navigate('/signin', { replace: true }), 2000);
        return;
      }

      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        const deviceId = localStorage.getItem('emailAuthDeviceId') || undefined;
        const data = await authAPI.verifyEmailToken(token, deviceId);

        if (data.same_device && data.auth) {
          const hasExistingProvider = !!data.auth.existing_provider;

          const doDirectLogin = () => {
            setPendingAuth({ token: data.auth!.token, user: data.auth!.user });
          };

          try {
            const channel = new BroadcastChannel(EMAIL_AUTH_CHANNEL);
            let received = false;

            channel.onmessage = (e) => {
              if (e.data?.type === 'auth-received') {
                received = true;
                channel.close();
                if (hasExistingProvider) {
                  localStorage.removeItem('emailAuthDeviceId');
                  localStorage.setItem('lastLoginProvider', 'email');
                  login(data.auth!.token, data.auth!.user);
                  setMergeInfo({
                    token: data.auth!.token,
                    user: data.auth!.user,
                    existingProvider: data.auth!.existing_provider!,
                  });
                } else {
                  window.close();
                  setCanClose(true);
                }
              }
            };

            channel.postMessage({
              type: 'email-auth-complete',
              auth: { ...data.auth, existing_provider: undefined },
            });

            setTimeout(() => {
              if (!received) {
                channel.close();
                doDirectLogin();
              }
            }, 500);
          } catch {
            doDirectLogin();
          }
        } else if (!data.same_device && data.verification_code) {
          setVerificationCode(data.verification_code);
        } else {
          setError(t('emailAuth.expired'));
          setTimeout(() => navigate('/signin', { replace: true }), 3000);
        }
      } catch {
        setError(t('emailAuth.expired'));
        setTimeout(() => navigate('/signin', { replace: true }), 3000);
      }
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmDirectSignIn = () => {
    if (!pendingAuth) return;
    setIsLoggingIn(true);
    localStorage.removeItem('emailAuthDeviceId');
    localStorage.setItem('lastLoginProvider', 'email');
    login(pendingAuth.token, pendingAuth.user);
    toast.success(t('oauth.loginSuccess'));
    const cliRedirect = localStorage.getItem('cli_signin_redirect');
    if (cliRedirect) {
      localStorage.removeItem('cli_signin_redirect');
      navigate(cliRedirect, { replace: true });
    } else {
      const next = consumePostLoginRedirect();
      navigate(next || '/', { replace: true });
    }
  };

  const handleCancelDirectSignIn = () => {
    setPendingAuth(null);
    navigate('/signin', { replace: true });
  };

  if (pendingAuth) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <Card className="rounded-3xl border-2 p-10">
            <CardContent className="p-0 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <EnvelopeIcon className="w-9 h-9 text-primary" strokeWidth={2} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t('emailAuth.confirmSignInTitle')}
              </h2>
              <p className="text-muted-foreground text-sm mb-1">
                {t('emailAuth.confirmSignInDesc', { email: pendingAuth.user.email })}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-8">
                {t('emailAuth.confirmSignInHint')}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleConfirmDirectSignIn} size="xl" className="w-full">
                  {t('emailAuth.confirmSignInButton')}
                </Button>
                <Button onClick={handleCancelDirectSignIn} variant="ghost" size="xl" className="w-full">
                  {t('emailAuth.cancelSignIn')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (canClose) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <StatusIcon variant="success" />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('emailAuth.loginCompleteTitle')}</h2>
              <p className="text-muted-foreground">{t('emailAuth.canCloseTab')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mergeInfo) {
    const ProviderLogo = providerLogoMap[mergeInfo.existingProvider];
    const providerName = t(`emailAuth.providerName.${mergeInfo.existingProvider}`);

    const handleMergeContinue = () => {
      toast.success(t('oauth.loginSuccess'));
      navigate('/', { replace: true });
    };

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

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <StatusIcon variant="error" />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('oauth.loginFailedTitle')}</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <p className="text-sm text-muted-foreground/70">{t('oauth.redirectingToLogin')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationCode) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <Card className="rounded-3xl border-2 p-10">
            <CardContent className="p-0 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <DevicePhoneMobileIcon className="w-10 h-10 text-primary" strokeWidth={2} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t('emailAuth.crossDeviceTitle')}
              </h2>
              <p className="text-muted-foreground text-sm mb-8">
                {t('emailAuth.crossDeviceDesc')}
              </p>

              <div className="relative bg-muted rounded-xl px-6 py-4 border border-foreground/[0.09]">
                <p className="text-[2.5rem] sm:text-4xl font-bold text-center text-foreground" style={{ letterSpacing: '0.1em' }}>
                  {verificationCode && verificationCode.length === 6
                    ? `${verificationCode.slice(0, 3)} ${verificationCode.slice(3)}`
                    : verificationCode}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(verificationCode || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {copied ? (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('uploadSuccess.copyCode')}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center pt-32 pb-20">
      <div className="flex flex-col items-center">
        <Spinner size="xl" />
        <p className="mt-4 text-muted-foreground">
          {isLoggingIn ? t('oauth.loggingIn') : t('common.loading')}
        </p>
      </div>
    </div>
  );
};

export default EmailMagicLinkCallbackPage;
