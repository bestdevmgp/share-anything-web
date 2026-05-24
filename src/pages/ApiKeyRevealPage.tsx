import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiKeyAPI, ApiKeyRevealResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import StatusIcon from '../components/StatusIcon';
import { copyToClipboard, formatDateTime } from '../utils/format';
import { toast } from '../context/ToastContext';
import { savePostLoginRedirect } from '../utils/postLoginRedirect';

type ErrorKind = 'alreadyRevealed' | 'expired' | 'notYours' | 'notFound' | 'generic';

const errorKindFromResponse = (status: number | undefined, reason: string | undefined): ErrorKind => {
  if (status === 410) {
    if (reason === 'expired') return 'expired';
    return 'alreadyRevealed';
  }
  if (status === 403) return 'notYours';
  if (status === 404) return 'notFound';
  return 'generic';
};

const ApiKeyRevealPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();

  const [data, setData] = useState<ApiKeyRevealResponse | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = errorKind ? t('apiKeyReveal.errorTitle') : t('apiKeyReveal.pageTitle');
    return () => { document.title = 'ShareAnything'; };
  }, [t, errorKind]);

  const fetchReveal = useCallback(async () => {
    if (!token) {
      setErrorKind('notFound');
      return;
    }
    setLoading(true);
    setErrorKind(null);
    try {
      const result = await apiKeyAPI.reveal(token);
      setData(result);
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { reason?: string } } }).response;
      setErrorKind(errorKindFromResponse(response?.status, response?.data?.reason));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const next = `/api-keys/reveal/${token ?? ''}`;
      savePostLoginRedirect(next);
      navigate(`/signin?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    if (data || errorKind) return;
    fetchReveal();
  }, [authLoading, isAuthenticated, data, errorKind, fetchReveal, navigate, token]);

  const handleCopy = async () => {
    if (!data) return;
    const ok = await copyToClipboard(data.api_key);
    if (ok) {
      setCopied(true);
      toast.success(t('apiKeyReveal.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = () => {
    navigate('/settings?tab=api-keys', { replace: true });
  };

  if (authLoading || !isAuthenticated || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (errorKind) {
    const variant = errorKind === 'expired'
      ? 'expired'
      : errorKind === 'generic'
        ? 'error'
        : 'invalid';
    return (
      <div className="flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <Card className="rounded-3xl border-2 p-8">
            <CardContent className="p-0">
              <StatusIcon variant={variant} />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('apiKeyReveal.errorTitle')}</h2>
              <p className="text-muted-foreground mb-6">{t(`apiKeyReveal.error.${errorKind}`)}</p>
              <Button variant="outline" onClick={() => navigate('/settings?tab=api-keys')}>
                {t('apiKeyReveal.backToSettings')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="pt-12 pb-20 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3">
            <StatusIcon variant="success" className="mb-0" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">{t('apiKeyReveal.title')}</h1>
        </div>

        <Card className="rounded-3xl border-2 px-6 md:px-10 py-4 md:py-5">
          <div className="mb-6">
            <label className="text-xs text-muted-foreground block mb-2">{t('apiKeyReveal.keyLabel')}</label>
            <div className="relative">
              <div className="bg-muted/40 border border-border rounded-md pl-3 pr-12 py-2 font-mono text-sm break-all">
                {data.api_key}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={t('apiKeyReveal.copy')}
                className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground can-hover:hover:text-foreground can-hover:hover:bg-accent transition-colors"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t('apiKeyReveal.keyCopyWarning')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.nameLabel')}</p>
              <p className="text-foreground font-medium break-words">{data.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.scopesLabel')}</p>
              <p className="text-foreground font-medium">
                {data.scopes.length > 0 ? data.scopes.map((s) => t(`settings.apiKeys.scope.${s}`)).join(', ') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.createdLabel')}</p>
              <p className="text-foreground font-medium">{formatDateTime(data.created_at, language)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.expiresLabel')}</p>
              <p className="text-foreground font-medium">
                {data.expires_at ? formatDateTime(data.expires_at, language) : t('apiKeyReveal.expiresNever')}
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-8">
          <Button onClick={handleConfirm} size="lg" className="w-full">
            {t('apiKeyReveal.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyRevealPage;
