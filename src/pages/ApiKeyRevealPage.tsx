import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { apiKeyAPI, ApiKeyRevealResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
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
    document.title = t('apiKeyReveal.pageTitle');
    return () => { document.title = 'ShareAnything'; };
  }, [t]);

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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('apiKeyReveal.loading')}</p>
      </div>
    );
  }

  if (errorKind) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-3">{t('apiKeyReveal.title')}</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {t(`apiKeyReveal.error.${errorKind}`)}
          </p>
          <Button variant="outline" onClick={() => navigate('/settings?tab=api-keys')} className="w-full">
            {t('apiKeyReveal.backToSettings')}
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{t('apiKeyReveal.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t('apiKeyReveal.subtitle')}</p>

        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-[3px] border-amber-500 rounded-md p-4 mb-6">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
            {t('apiKeyReveal.warningTitle')}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('apiKeyReveal.warningBody')}
          </p>
        </div>

        <div className="mb-6">
          <label className="text-xs text-muted-foreground block mb-2">{t('apiKeyReveal.keyLabel')}</label>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 bg-muted/40 border border-border rounded-md px-3 py-2 font-mono text-sm break-all">
              {data.api_key}
            </div>
            <Button
              type="button"
              onClick={handleCopy}
              variant={copied ? 'secondary' : 'default'}
              className="shrink-0"
            >
              {copied ? (
                <><CheckIcon className="w-4 h-4 mr-1" />{t('apiKeyReveal.copied')}</>
              ) : (
                <><ClipboardDocumentIcon className="w-4 h-4 mr-1" />{t('apiKeyReveal.copy')}</>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.nameLabel')}</p>
            <p className="text-foreground font-medium break-words">{data.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('apiKeyReveal.scopesLabel')}</p>
            <p className="text-foreground font-medium">
              {data.scopes.length > 0 ? data.scopes.join(', ') : '-'}
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

        <Button onClick={() => navigate('/settings?tab=api-keys')} className="w-full">
          {t('apiKeyReveal.done')}
        </Button>
      </div>
    </div>
  );
};

export default ApiKeyRevealPage;
