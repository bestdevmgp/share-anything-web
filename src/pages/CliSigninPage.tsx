import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { useAuth } from '../context/AuthContext';
import { cliAuthAPI } from '../services/api';
import { toast } from '../context/ToastContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';

type SessionStatus = 'loading' | 'pending' | 'completed' | 'expired' | 'error';

const CliSigninPage: React.FC = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = t('cliSignin.pageTitle');
  }, [t]);

  useEffect(() => {
    if (!sessionId) {
      setSessionStatus('error');
      setError(t('cliSignin.invalidSession'));
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await cliAuthAPI.getStatus(sessionId);
        if (data.status === 'expired') {
          setSessionStatus('expired');
        } else if (data.status === 'completed') {
          setSessionStatus('completed');
        } else {
          setSessionStatus('pending');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setSessionStatus('expired');
        } else {
          setSessionStatus('error');
          setError(t('cliSignin.checkStatusFailed'));
        }
      }
    };

    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (authLoading || sessionStatus !== 'pending') return;

    if (!isAuthenticated) {
      localStorage.setItem('cli_signin_redirect', `/cli-signin/${sessionId}`);
      toast.info(t('cliSignin.signInFirst'));
      navigate('/signin', { replace: true });
    }
  }, [authLoading, isAuthenticated, sessionStatus, sessionId, navigate]);

  const handleApprove = async () => {
    if (!sessionId) return;
    setApproving(true);
    try {
      await cliAuthAPI.completeSession(sessionId);
      setApproved(true);
    } catch (err: any) {
      if (err.response?.status === 410 || err.response?.status === 404) {
        setSessionStatus('expired');
      } else if (err.response?.status === 409) {
        setSessionStatus('completed');
      } else {
        setError(t('cliSignin.approveFailed'));
      }
    } finally {
      setApproving(false);
    }
  };

  if (sessionStatus === 'loading' || authLoading) {
    return (
      <div className="flex items-center justify-center pt-32 pb-20">
        <div className="flex flex-col items-center">
          <Spinner size="xl" />
          <p className="mt-4 text-muted-foreground">{t('cliSignin.checking')}</p>
        </div>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" className="cli-signin-checkmark-path" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('cliSignin.successTitle')}</h2>
              <p className="text-muted-foreground">{t('cliSignin.successDescription')}</p>
            </CardContent>
          </Card>
          <style>{`
            .cli-signin-checkmark-path {
              stroke-dasharray: 20;
              stroke-dashoffset: 20;
              animation: drawCliSigninCheck 0.6s ease-out forwards;
            }
            @keyframes drawCliSigninCheck {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('cliSignin.expiredTitle')}</h2>
              <p className="text-muted-foreground">{t('cliSignin.expiredDescription')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'completed') {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('cliSignin.alreadyCompletedTitle')}</h2>
              <p className="text-muted-foreground">{t('cliSignin.alreadyCompletedDescription')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'error' || error) {
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6" />
                  <path d="M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('cliSignin.errorTitle')}</h2>
              <p className="text-muted-foreground">{error || t('cliSignin.errorDefault')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <Card className="rounded-3xl border-2 p-10">
          <CardContent className="p-0 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-9 h-9 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('cliSignin.approveTitle')}
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              {t('cliSignin.approveDescription')}
            </p>

            {user && (
              <div className="bg-muted rounded-xl px-5 py-4 mb-6 border border-foreground/[0.09]">
                <div className="flex items-center gap-3">
                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground/70 mb-6">
              {t('cliSignin.approveWarning')}
            </p>

            <Button
              onClick={handleApprove}
              disabled={approving}
              size="xl"
              className="w-full"
            >
              {approving ? <Spinner size="sm" className="text-primary-foreground" /> : t('cliSignin.approveButton')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CliSigninPage;
