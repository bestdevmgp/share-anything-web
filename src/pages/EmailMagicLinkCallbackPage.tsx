import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const EmailMagicLinkCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [error, setError] = useState('');
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
        const data = await authAPI.verifyEmailToken(token);

        if (data.same_device && data.auth) {
          // Same device — auto login
          localStorage.setItem('lastLoginProvider', 'email');
          login(data.auth.token, data.auth.user);
          toast.success(t('oauth.loginSuccess'));
          navigate('/', { replace: true });
        } else if (!data.same_device && data.verification_code) {
          // Different device — show code
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

  // Error view
  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full border border-border flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('oauth.loginFailedTitle')}</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <p className="text-sm text-muted-foreground/70">{t('oauth.redirectingToLogin')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Cross-device view — show verification code
  if (verificationCode) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full">
          <Card className="rounded-3xl border-2 p-10">
            <CardContent className="p-0 text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <DevicePhoneMobileIcon className="w-8 h-8 text-primary" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                {t('emailAuth.crossDeviceTitle')}
              </h2>
              <p className="text-muted-foreground text-sm mb-8">
                {t('emailAuth.crossDeviceDesc')}
              </p>

              <div className="bg-muted rounded-2xl py-6 px-4">
                <span className="text-4xl font-mono tracking-[0.5em] text-foreground font-bold">
                  {verificationCode}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading view
  return (
    <div className="flex items-center justify-center pt-32 pb-20">
      <div className="flex flex-col items-center">
        <Spinner size="xl" />
        <p className="mt-4 text-muted-foreground">{t('oauth.loggingIn')}</p>
      </div>
    </div>
  );
};

export default EmailMagicLinkCallbackPage;
