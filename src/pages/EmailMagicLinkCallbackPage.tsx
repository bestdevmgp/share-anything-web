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
import { DevicePhoneMobileIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

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
          try {
            const channel = new BroadcastChannel(EMAIL_AUTH_CHANNEL);
            let received = false;

            channel.onmessage = (e) => {
              if (e.data?.type === 'auth-received') {
                received = true;
                channel.close();
                window.close();
                setCanClose(true);
              }
            };

            channel.postMessage({
              type: 'email-auth-complete',
              auth: data.auth,
            });

            setTimeout(() => {
              if (!received) {
                channel.close();
                setIsLoggingIn(true);
                localStorage.removeItem('emailAuthDeviceId');
                localStorage.setItem('lastLoginProvider', 'email');
                login(data.auth!.token, data.auth!.user);
                toast.success(t('oauth.loginSuccess'));
                navigate('/', { replace: true });
              }
            }, 500);
          } catch {
            setIsLoggingIn(true);
            localStorage.removeItem('emailAuthDeviceId');
            localStorage.setItem('lastLoginProvider', 'email');
            login(data.auth.token, data.auth.user);
            toast.success(t('oauth.loginSuccess'));
            navigate('/', { replace: true });
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

  if (canClose) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="check-path" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('emailAuth.loginCompleteTitle')}</h2>
              <p className="text-muted-foreground">{t('emailAuth.canCloseTab')}</p>
            </CardContent>
          </Card>
          <style>{`
            .check-path {
              stroke-dasharray: 24;
              stroke-dashoffset: 24;
              animation: drawCheck 0.4s ease-out forwards;
            }
            @keyframes drawCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
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
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6" className="error-x-path-1" />
                  <path d="M6 6l12 12" className="error-x-path-2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('oauth.loginFailedTitle')}</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <p className="text-sm text-muted-foreground/70">{t('oauth.redirectingToLogin')}</p>
            </CardContent>
          </Card>
          <style>{`
            .error-x-path-1,
            .error-x-path-2 {
              stroke-dasharray: 17;
              stroke-dashoffset: 17;
            }
            .error-x-path-1 {
              animation: drawX 0.4s ease-out forwards;
            }
            .error-x-path-2 {
              animation: drawX 0.4s ease-out 0.2s forwards;
            }
            @keyframes drawX {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
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
                <p className="text-3xl sm:text-4xl font-bold text-center text-foreground" style={{ letterSpacing: '0.1em' }}>
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
