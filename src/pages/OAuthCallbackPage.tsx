import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { AuthResponse } from '../types';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { Card, CardContent } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';

const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: 'google' | 'naver' | 'kakao' | 'apple' }>();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('oauth.loggingIn');
  }, [t]);
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (!provider) {
        setError(t('oauth.invalidRequest'));
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const token = searchParams.get('token');
      const userParam = searchParams.get('user');
      const appleUser = searchParams.get('apple_user');

      const processedKey = `oauth_processed_${code}`;
      if (code && localStorage.getItem(processedKey)) {
        return;
      }

      if (hasProcessed.current) {
        return;
      }

      if (token && userParam) {
        try {
          hasProcessed.current = true;
          if (code) localStorage.setItem(processedKey, 'true');

          const user = JSON.parse(decodeURIComponent(userParam));
          login(token, user);
          navigate('/', { replace: true });
          return;
        } catch (err) {
          setError(t('oauth.userParseError'));
          setTimeout(() => navigate('/signin', { replace: true }), 2000);
          return;
        }
      }

      if (errorParam) {
        setError(t('oauth.loginCancelledOrError', { error: errorParam }));
        setTimeout(() => navigate('/signin', { replace: true }), 3000);
        return;
      }

      if (!code) {
        setError(t('oauth.noAuthCode'));
        setTimeout(() => navigate('/signin', { replace: true }), 3000);
        return;
      }

      hasProcessed.current = true;
      localStorage.setItem(processedKey, 'true');

      try {
        const data: AuthResponse = await authAPI.handleOAuthCallback(
          provider,
          code,
          state || provider,
          appleUser || undefined
        );

        if (data.token && data.user) {
          login(data.token, data.user);
          localStorage.removeItem(processedKey);
          toast.success(t('oauth.loginSuccess'));
          navigate('/', { replace: true });
        } else {
          toast.error(t('oauth.noLoginInfo'));
          setTimeout(() => navigate('/signin', { replace: true }), 3000);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || t('oauth.loginFailed');
        toast.error(errorMessage);
        setTimeout(() => navigate('/signin', { replace: true }), 3000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 dark:bg-black dark:border-white/30 p-8">
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

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-muted-foreground">{t('oauth.loggingIn')}</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
