import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { AuthResponse } from '../types';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';

const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: 'google' | 'naver' }>();
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
          setTimeout(() => navigate('/login', { replace: true }), 2000);
          return;
        }
      }

      if (errorParam) {
        setError(t('oauth.loginCancelledOrError', { error: errorParam }));
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      if (!code) {
        setError(t('oauth.noAuthCode'));
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
      }

      hasProcessed.current = true;
      localStorage.setItem(processedKey, 'true');

      try {
        const data: AuthResponse = await authAPI.handleOAuthCallback(
          provider,
          code,
          state || provider
        );

        if (data.token && data.user) {
          login(data.token, data.user);
          localStorage.removeItem(processedKey);
          toast.success(t('oauth.loginSuccess'));
          navigate('/', { replace: true });
        } else {
          toast.error(t('oauth.noLoginInfo'));
          setTimeout(() => navigate('/login', { replace: true }), 3000);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || t('oauth.loginFailed');
        toast.error(errorMessage);
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('oauth.loginFailedTitle')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">{t('oauth.redirectingToLogin')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('oauth.loggingIn')}</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
