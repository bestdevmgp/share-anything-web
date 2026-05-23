import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'context/ToastContext';
import { useTranslation } from 'i18n';
import { useLanguage } from 'context/LanguageContext';
import { useTheme } from 'context/ThemeContext';
import { userAPI, personalTokenAPI, sessionAPI, apiKeyAPI } from 'services/api';
import type { ApiKeyApplicationResponse, ApiKeyItem } from 'services/api';
import { formatDateOnly, formatDateTime } from 'utils/format';
import { ensureDeviceId } from 'utils/deviceId';
import type { Session, TrustedDevice } from 'types';
import { Button } from 'components/ui/button';
import { Checkbox } from 'components/ui/checkbox';
import { Input } from 'components/ui/input';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import { Separator } from 'components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { Spinner } from 'components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from 'components/ui/dialog';
import { GlobeAltIcon, SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentIcon, KeyIcon, ExclamationTriangleIcon, EnvelopeIcon, CommandLineIcon, ClockIcon } from '@heroicons/react/24/outline';
import { providerLogoMap } from 'utils/providerLogos';

type Tab = 'notifications' | 'general' | 'account' | 'sessions' | 'personal-tokens' | 'api-keys';

interface PersonalTokenItem {
  id: string;
  token_prefix: string;
  name: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const langOptions = [
  { key: 'ko' as const, label: '한국어' },
  { key: 'en' as const, label: 'English' },
  { key: 'ja' as const, label: '日本語' },
  { key: 'zh-CN' as const, label: '简体中文' },
  { key: 'zh-TW' as const, label: '繁體中文' },
];

const themeIcons: Record<string, React.ReactNode> = {
  system: <ComputerDesktopIcon className="w-4 h-4" />,
  light: <SunIcon className="w-[18px] h-[18px]" />,
  dark: <MoonIcon className="w-4 h-4" />,
};

const SettingsPage: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language: siteLanguage, setLanguage: setSiteLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: Tab = (
    tabParam === 'notifications' ? 'notifications'
      : tabParam === 'account' ? 'account'
      : tabParam === 'sessions' ? 'sessions'
      : tabParam === 'personal-tokens' ? 'personal-tokens'
      : tabParam === 'api-keys' ? 'api-keys'
      : 'general'
  );
  const setActiveTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyDownload, setNotifyDownload] = useState(true);
  const [notifyDownloadAlert, setNotifyDownloadAlert] = useState(true);
  const [notifySecurity, setNotifySecurity] = useState(true);
  const [notifyLanguage, setNotifyLanguage] = useState('ko');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t('settings.pageTitle');
    return () => { document.title = 'ShareAnything'; };
  }, [t]);

  const [notifyLangOpen, setNotifyLangOpen] = useState(false);
  const [siteLangOpen, setSiteLangOpen] = useState(false);
  const [siteThemeOpen, setSiteThemeOpen] = useState(false);

  const [personalTokens, setPersonalTokens] = useState<PersonalTokenItem[]>([]);
  const [personalTokensLoading, setPersonalTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [apiApplications, setApiApplications] = useState<ApiKeyApplicationResponse[]>([]);
  const [apiApplicationsLoading, setApiApplicationsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyServiceName, setApplyServiceName] = useState('');
  const [applyServiceUrl, setApplyServiceUrl] = useState('');
  const [applyPurpose, setApplyPurpose] = useState('');
  const [applyScopes, setApplyScopes] = useState<Array<'read' | 'upload' | 'delete'>>(['read', 'upload', 'delete']);
  const [applyTerms, setApplyTerms] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);

  type ExpirationOption = '7d' | '30d' | '60d' | '90d' | 'custom' | 'none';
  const [applyExpiration, setApplyExpiration] = useState<ExpirationOption>('30d');
  const [applyCustomDate, setApplyCustomDate] = useState<string>('');
  const [applyExpirationOpen, setApplyExpirationOpen] = useState(false);

  const toggleApplyScope = (s: 'read' | 'upload' | 'delete') => {
    setApplyScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const APPLY_DRAFT_KEY = 'apiKeyApplyDraft';

  const clearApplyDraft = () => {
    sessionStorage.removeItem(APPLY_DRAFT_KEY);
    setShowApplyModal(false);
    setApplyServiceName('');
    setApplyServiceUrl('');
    setApplyPurpose('');
    setApplyScopes(['read', 'upload', 'delete']);
    setApplyTerms(false);
    setApplyExpiration('30d');
    setApplyCustomDate('');
  };

  useEffect(() => {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setApplyServiceName(d.serviceName || '');
      setApplyServiceUrl(d.serviceUrl || '');
      setApplyPurpose(d.purpose || '');
      if (Array.isArray(d.scopes)) setApplyScopes(d.scopes);
      setApplyTerms(!!d.terms);
      if (d.expiration) setApplyExpiration(d.expiration);
      if (d.customDate) setApplyCustomDate(d.customDate);
      setShowApplyModal(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!showApplyModal) return;
    sessionStorage.setItem(APPLY_DRAFT_KEY, JSON.stringify({
      serviceName: applyServiceName,
      serviceUrl: applyServiceUrl,
      purpose: applyPurpose,
      scopes: applyScopes,
      terms: applyTerms,
      expiration: applyExpiration,
      customDate: applyCustomDate,
    }));
  }, [showApplyModal, applyServiceName, applyServiceUrl, applyPurpose, applyScopes, applyTerms, applyExpiration, applyCustomDate]);

  const [selectedApplication, setSelectedApplication] = useState<ApiKeyApplicationResponse | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [terminatingJti, setTerminatingJti] = useState<string | null>(null);
  const [deletingTrustedId, setDeletingTrustedId] = useState<string | null>(null);
  const [showTerminateOthersConfirm, setShowTerminateOthersConfirm] = useState(false);
  const [terminatingOthers, setTerminatingOthers] = useState(false);

  const themeOptions = [
    { key: 'system' as const, label: t('footer.themeSystem') },
    { key: 'light' as const, label: t('footer.themeLight') },
    { key: 'dark' as const, label: t('footer.themeDark') },
  ];

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    const fetchSettings = async () => {
      try {
        const settings = await userAPI.getNotificationSettings();
        setNotifyUpload(settings.notify_upload);
        setNotifyDownload(settings.notify_download);
        setNotifyDownloadAlert(settings.notify_download_alert);
        setNotifySecurity(settings.notify_security);
        setNotifyLanguage(settings.notify_language);
      } catch {
        toast.error(t('settings.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    if (user?.name) {
      setEditName(user.name);
    }

    const fetchPersonalTokens = async () => {
      setPersonalTokensLoading(true);
      try {
        const tokens = await personalTokenAPI.list();
        setPersonalTokens(tokens);
      } catch {
      } finally {
        setPersonalTokensLoading(false);
      }
    };
    fetchPersonalTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (activeTab !== 'api-keys' || !isAuthenticated) return;

    const fetchApiKeysData = async () => {
      setApiApplicationsLoading(true);
      setApiKeysLoading(true);
      try {
        const [applications, keys] = await Promise.all([
          apiKeyAPI.listApplications(),
          apiKeyAPI.listKeys(),
        ]);
        setApiApplications(applications);
        setApiKeys(keys);
      } catch {
        toast.error(t('settings.fetchFailed'));
      } finally {
        setApiApplicationsLoading(false);
        setApiKeysLoading(false);
      }
    };

    fetchApiKeysData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab !== 'sessions' || sessionsLoaded || !isAuthenticated) return;

    const fetchSessions = async () => {
      setSessionsLoading(true);
      try {
        const [sessionList, trustedList] = await Promise.all([
          sessionAPI.list(),
          sessionAPI.listTrusted(),
        ]);
        setSessions(sessionList);
        setTrustedDevices(trustedList);
        setSessionsLoaded(true);
      } catch {
        toast.error(t('settings.fetchFailed'));
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  const handleTerminateSession = async (jti: string) => {
    setTerminatingJti(jti);
    try {
      await sessionAPI.terminate(jti);
      setSessions((prev) => prev.filter((s) => s.jti !== jti));
      toast.success(t('settings.terminateSessionSuccess'));
    } catch {
      toast.error(t('settings.terminateSessionFailed'));
    } finally {
      setTerminatingJti(null);
    }
  };

  const handleTerminateOthers = async () => {
    setTerminatingOthers(true);
    try {
      await sessionAPI.terminateOthers();
      setSessions((prev) => prev.filter((s) => s.is_current));
      setShowTerminateOthersConfirm(false);
      toast.success(t('settings.terminateOthersSuccess'));
    } catch {
      toast.error(t('settings.terminateSessionFailed'));
    } finally {
      setTerminatingOthers(false);
    }
  };

  const handleDeleteTrustedDevice = async (id: string) => {
    setDeletingTrustedId(id);
    try {
      await sessionAPI.deleteTrusted(id);
      setTrustedDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success(t('settings.deleteTrustedDeviceSuccess'));
    } catch {
      toast.error(t('settings.deleteTrustedDeviceFailed'));
    } finally {
      setDeletingTrustedId(null);
    }
  };

  const handleToggle = async (field: 'upload' | 'download' | 'downloadAlert' | 'security', value: boolean) => {
    if (field === 'security' && !value) {
      const confirmed = window.confirm(t('settings.securityNotificationDisableWarning'));
      if (!confirmed) return;
    }

    const prevUpload = notifyUpload;
    const prevDownload = notifyDownload;
    const prevDownloadAlert = notifyDownloadAlert;
    const prevSecurity = notifySecurity;

    if (field === 'upload') {
      setNotifyUpload(value);
    } else if (field === 'download') {
      setNotifyDownload(value);
    } else if (field === 'downloadAlert') {
      setNotifyDownloadAlert(value);
    } else {
      setNotifySecurity(value);
    }

    try {
      await userAPI.updateNotificationSettings({
        notify_upload: field === 'upload' ? value : notifyUpload,
        notify_download: field === 'download' ? value : notifyDownload,
        notify_download_alert: field === 'downloadAlert' ? value : notifyDownloadAlert,
        notify_security: field === 'security' ? value : notifySecurity,
        notify_language: notifyLanguage,
      });
      toast.success(t('settings.updateSuccess'));
    } catch {
      setNotifyUpload(prevUpload);
      setNotifyDownload(prevDownload);
      setNotifyDownloadAlert(prevDownloadAlert);
      setNotifySecurity(prevSecurity);
      toast.error(t('settings.updateFailed'));
    }
  };

  const handleNotifyLanguageChange = async (newLang: string) => {
    const prevLang = notifyLanguage;
    setNotifyLanguage(newLang);
    setNotifyLangOpen(false);

    try {
      await userAPI.updateNotificationSettings({
        notify_upload: notifyUpload,
        notify_download: notifyDownload,
        notify_download_alert: notifyDownloadAlert,
        notify_security: notifySecurity,
        notify_language: newLang,
      });
      toast.success(t('settings.updateSuccess'));
    } catch {
      setNotifyLanguage(prevLang);
      toast.error(t('settings.updateFailed'));
    }
  };

  const handleCreatePersonalToken = async () => {
    setCreatingToken(true);
    try {
      const result = await personalTokenAPI.generate(newTokenName || undefined, undefined);
      setCreatedToken(result.personal_token);
      setNewTokenName('');
      const tokens = await personalTokenAPI.list();
      setPersonalTokens(tokens);
    } catch {
      toast.error(t('settings.personalTokenCreateFailed'));
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokePersonalToken = async (tokenId: string) => {
    try {
      await personalTokenAPI.revoke(tokenId);
      setPersonalTokens(personalTokens.filter(t => t.id !== tokenId));
      toast.success(t('settings.personalTokenRevoked'));
    } catch {
      toast.error(t('settings.personalTokenRevokeFailed'));
    }
  };

  const computeExpiresAt = (opt: ExpirationOption, customDate: string): string | null => {
    if (opt === 'none') return null;
    if (opt === 'custom') {
      if (!customDate) return null;
      return new Date(customDate + 'T23:59:59Z').toISOString();
    }
    const days = ({ '7d': 7, '30d': 30, '60d': 60, '90d': 90 } as Record<string, number>)[opt]!;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const handleApplyApiKey = async () => {
    setApplySubmitting(true);
    try {
      const tzOffsetMinutes = -new Date().getTimezoneOffset();
      await apiKeyAPI.apply({
        service_name: applyServiceName.trim(),
        service_url: applyServiceUrl.trim(),
        purpose: applyPurpose.trim(),
        scopes: applyScopes,
        tz_offset_minutes: tzOffsetMinutes,
        requested_expires_at: computeExpiresAt(applyExpiration, applyCustomDate),
      });
      clearApplyDraft();
      toast.success(t('settings.apiKeys.toast.applied'));
      const applications = await apiKeyAPI.listApplications();
      setApiApplications(applications);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        toast.error(t('settings.apiKeys.toast.dailyLimit'));
      } else {
        toast.error(err?.response?.data?.message || t('settings.updateFailed'));
      }
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    setRevokingKeyId(id);
    try {
      await apiKeyAPI.revoke(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
      setRevokeKeyId(null);
      toast.success(t('settings.apiKeys.toast.revoked'));
    } catch {
      toast.error(t('settings.updateFailed'));
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleUpdateName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === user?.name) return;

    setSavingName(true);
    try {
      const result = await userAPI.updateName(trimmed);
      updateUser({ name: result.name });
      toast.success(t('settings.updateSuccess'));
    } catch {
      toast.error(t('settings.updateFailed'));
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await userAPI.deleteAccount();
      logout();
      toast.success(t('settings.accountDeleted'));
      navigate('/');
    } catch {
      toast.error(t('settings.accountDeleteFailed'));
      setDeletingAccount(false);
    }
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="animate-pulse">
          <div className="h-8 bg-black/[0.08] dark:bg-muted rounded w-20 mb-8" />

          <div className="flex flex-col md:flex-row gap-0">
            <div className="md:w-56 flex-shrink-0 md:pr-8 md:border-r md:border-black/15 md:dark:border-border pb-4 md:pb-0">
              <div className="flex gap-2 md:flex-col md:gap-1.5">
                <div className="h-[34px] flex items-center px-3 md:w-full">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8 md:w-4/5" />
                </div>
                <div className="h-[34px] flex items-center px-3 md:w-full">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8 md:w-4/5" />
                </div>
                <div className="h-[34px] flex items-center px-3 md:w-full">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8 md:w-4/5" />
                </div>
                <div className="h-[34px] flex items-center px-3 md:w-full">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8 md:w-4/5" />
                </div>
                <div className="h-[34px] flex items-center px-3 md:hidden">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8" />
                </div>
                <div className="h-[34px] flex items-center px-3 md:hidden">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-8" />
                </div>
              </div>
              <div className="hidden md:block pt-3 mt-3 border-t border-black/15 dark:border-border">
                <div className="h-3 bg-black/[0.08] dark:bg-muted rounded w-10 mx-3 mb-2" />
              </div>
              <div className="hidden md:block space-y-1">
                <div className="h-[34px] flex items-center px-3">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-4/5" />
                </div>
                <div className="h-[34px] flex items-center px-3">
                  <div className="h-[18px] bg-black/[0.08] dark:bg-muted rounded w-4/5" />
                </div>
              </div>
              <Separator className="md:hidden mt-4" />
            </div>

            <div className="flex-1 md:pl-10 pt-4 md:pt-0 space-y-6">
              <div>
                <div className="h-6 bg-black/[0.08] dark:bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-black/[0.08] dark:bg-muted rounded w-56" />
              </div>

              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Separator />
                  <div className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-black/[0.08] dark:bg-muted rounded w-24" />
                      <div className="h-6 w-11 bg-black/[0.08] dark:bg-muted rounded-full" />
                    </div>
                    <div className="h-4 bg-black/[0.08] dark:bg-muted rounded w-48 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentNotifyLang = langOptions.find((o) => o.key === notifyLanguage) || langOptions[0];
  const currentSiteLang = langOptions.find((o) => o.key === siteLanguage)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
      <h1 className="text-2xl font-bold text-foreground mb-8">{t('settings.pageTitle')}</h1>

      <div className="flex flex-col md:flex-row gap-0">
        <div className="md:w-56 flex-shrink-0 md:pr-8 md:border-r md:border-black/15 md:dark:border-border pb-4 md:pb-0">
          <nav className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2 md:pb-0 md:overflow-visible md:whitespace-normal md:flex-col md:space-y-1 md:gap-0">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'general'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.general')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'notifications'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.notifications')}
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'sessions'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.sessions')}
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'account'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.account')}
            </button>
            <div className="hidden md:block pt-3 mt-3 border-t border-black/15 dark:border-border">
              <p className="px-3 pb-1 text-xs text-black/25 dark:text-muted-foreground/60">{t('settings.developerSection')}</p>
            </div>
            <Separator orientation="vertical" className="md:hidden h-6 self-center" />
            <button
              onClick={() => setActiveTab('personal-tokens')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'personal-tokens'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.personalTokens')}
            </button>
            <button
              onClick={() => setActiveTab('api-keys')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'api-keys'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.apiKeys.title')}
            </button>
          </nav>
          <Separator className="md:hidden mt-4" />
        </div>

        <div className="flex-1 md:pl-10 pt-4 md:pt-0">
          {activeTab === 'notifications' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.notifications')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.notificationDescription')}</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.uploadNotification')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.uploadNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    checked={notifyUpload}
                    onCheckedChange={(checked) => handleToggle('upload', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.downloadNotification')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.downloadNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    checked={notifyDownload}
                    onCheckedChange={(checked) => handleToggle('download', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.downloadAlertNotification')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.downloadAlertNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    checked={notifyDownloadAlert}
                    onCheckedChange={(checked) => handleToggle('downloadAlert', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.securityNotification')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.securityNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    className="flex-shrink-0"
                    checked={notifySecurity}
                    onCheckedChange={(checked) => handleToggle('security', checked)}
                  />
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.notifyLanguage')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.notifyLanguageDescription')}
                    </p>
                  </div>
                  <Popover open={notifyLangOpen} onOpenChange={setNotifyLangOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="group flex items-center justify-between w-40 h-10 px-2.5 border border-border bg-card text-muted-foreground can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm flex-shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="w-4 h-4" />
                          <span>{currentNotifyLang.label}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="start" sideOffset={4} className="w-40 p-0 rounded-none border border-border bg-card sm:align-end">
                      <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('footer.language')}</div>
                      {langOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => handleNotifyLanguageChange(option.key)}
                          className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                            notifyLanguage === option.key
                              ? 'text-foreground'
                              : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                          }`}
                        >
                          <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${notifyLanguage === option.key ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.general')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.generalDescription')}</p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.siteLanguage')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.siteLanguageDescription')}
                    </p>
                  </div>
                  <Popover open={siteLangOpen} onOpenChange={setSiteLangOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="group flex items-center justify-between w-40 h-10 px-2.5 border border-border bg-card text-muted-foreground can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm flex-shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="w-4 h-4" />
                          <span>{currentSiteLang.label}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="start" sideOffset={4} className="w-40 p-0 rounded-none border border-border bg-card sm:align-end">
                      <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('footer.language')}</div>
                      {langOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => { setSiteLanguage(option.key); setSiteLangOpen(false); }}
                          className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                            siteLanguage === option.key
                              ? 'text-foreground'
                              : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                          }`}
                        >
                          <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${siteLanguage === option.key ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{t('settings.siteTheme')}</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.siteThemeDescription')}
                    </p>
                  </div>
                  <Popover open={siteThemeOpen} onOpenChange={setSiteThemeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="group flex items-center justify-between w-40 h-10 px-2.5 border border-border bg-card text-muted-foreground can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm flex-shrink-0"
                      >
                        <div className="flex items-center gap-2">
                          {themeIcons[theme]}
                          <span>{themeOptions.find((o) => o.key === theme)?.label}</span>
                        </div>
                        <ChevronDownIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="start" sideOffset={4} className="w-40 p-0 rounded-none border border-border bg-card sm:align-end">
                      <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('footer.theme')}</div>
                      {themeOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => { setTheme(option.key); setSiteThemeOpen(false); }}
                          className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                            theme === option.key
                              ? 'text-foreground'
                              : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                          }`}
                        >
                          <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${theme === option.key ? 'opacity-100' : 'opacity-0'}`} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'account' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.account')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.accountDescription')}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">{t('settings.accountName')}</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {t('settings.accountNameDescription')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:max-w-sm">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim() && editName.trim() !== user?.name && !savingName) {
                          handleUpdateName();
                        }
                      }}
                      maxLength={50}
                      className="flex-1 h-10 rounded-lg px-4 text-sm"
                    />
                    <Button
                      onClick={handleUpdateName}
                      disabled={savingName || !editName.trim() || editName.trim() === user?.name}
                      className="flex-shrink-0 relative h-10"
                    >
                      <span className={savingName ? 'invisible' : ''}>{t('settings.accountNameSave')}</span>
                      {savingName && <Spinner size="sm" className="text-primary-foreground absolute" />}
                    </Button>
                  </div>
                </div>

                {user?.oauth_provider && (
                  <div>
                    <Label className="text-sm font-medium">{t('settings.signinMethod')}</Label>
                    <div className="mt-3">
                      {(() => {
                        const provider = user.oauth_provider!;
                        if (provider === 'email') {
                          return (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <EnvelopeIcon className="w-5 h-5 text-primary" strokeWidth={2} />
                            </div>
                          );
                        }
                        const ProviderLogo = providerLogoMap[provider];
                        if (!ProviderLogo) return null;
                        const bgClass = ({
                          google: 'bg-[#F2F2F2] dark:bg-[#131314]',
                          naver: 'bg-[#03C75A]',
                          kakao: 'bg-[#FEE500]',
                          apple: 'bg-black dark:bg-white text-white dark:text-black',
                        } as Record<string, string>)[provider] || 'bg-muted';
                        const logoSizeClass = provider === 'naver' ? 'w-4 h-4' : 'w-5 h-5';
                        return (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
                            <ProviderLogo className={logoSizeClass} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-sm font-medium">{t('settings.accountDelete')}</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {t('settings.accountDeleteDescription')}
                  </p>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      {t('settings.accountDelete')}
                    </Button>
                  ) : (
                    <div className="p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {t('settings.accountDeleteConfirmTitle')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('settings.accountDeleteConfirmDescription')}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(false)}
                              disabled={deletingAccount}
                              className="px-5"
                            >
                              {t('settings.accountDeleteCancel')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteAccount}
                              disabled={deletingAccount}
                              className="relative px-5"
                            >
                              <span className={deletingAccount ? 'invisible' : ''}>{t('settings.accountDeleteConfirm')}</span>
                              {deletingAccount && <Spinner size="sm" className="text-destructive-foreground absolute" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'sessions' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.sessions')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.sessionsDescription')}</p>
              </div>

              <div className="mb-10">
                <div className="mb-4">
                  <Label className="text-sm font-medium">
                    {t('settings.activeSessions')}
                    {sessionsLoaded && (
                      <span className="ml-1.5 text-muted-foreground">({sessions.length})</span>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">{t('settings.activeSessionsDescription')}</p>
                </div>

                {sessionsLoading && !sessionsLoaded ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-black/[0.08] dark:bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ComputerDesktopIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('settings.noActiveSessions')}</p>
                  </div>
                ) : (
                  <>
                    {sessions.map((session, index) => (
                      <div key={session.jti}>
                        {index > 0 && <Separator />}
                        <div className="flex items-start justify-between gap-3 py-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground truncate">
                                {session.device_label || t('settings.unknownDevice')}
                              </span>
                              {session.kind === 'cli' && (
                                <span className="text-xs bg-foreground/[0.05] dark:bg-foreground/[0.08] text-muted-foreground px-2 py-0.5 rounded inline-flex items-center gap-1">
                                  <CommandLineIcon className="w-3 h-3" />
                                  CLI
                                </span>
                              )}
                              {session.is_current && (
                                <span className="text-xs bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                  {t('settings.currentSession')}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                              {session.kind !== 'cli' && (
                                <div>
                                  {session.ip_address}
                                  {session.location && <span> · {session.location}</span>}
                                </div>
                              )}
                              <div>
                                {t('settings.lastActive')}: {formatDateTime(session.last_seen_at, siteLanguage)}
                              </div>
                              <div>
                                {t('settings.loggedInAt')}: {formatDateTime(session.created_at, siteLanguage)}
                              </div>
                            </div>
                          </div>
                          {!session.is_current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTerminateSession(session.jti)}
                              disabled={terminatingJti === session.jti}
                              className="relative text-red-600 dark:text-red-400 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 flex-shrink-0"
                            >
                              <span className={terminatingJti === session.jti ? 'invisible' : ''}>
                                {t('settings.terminateSession')}
                              </span>
                              {terminatingJti === session.jti && <Spinner size="sm" className="absolute" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {sessions.filter((s) => !s.is_current).length > 0 && (
                      <div className="pt-4">
                        {!showTerminateOthersConfirm ? (
                          <Button
                            variant="destructive"
                            onClick={() => setShowTerminateOthersConfirm(true)}
                          >
                            {t('settings.terminateOthers')}
                          </Button>
                        ) : (
                          <div className="p-4 border border-border rounded-lg bg-muted/50">
                            <div className="flex items-start gap-3">
                              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {t('settings.terminateOthersConfirmTitle')}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {t('settings.terminateOthersConfirmDescription')}
                                </p>
                                <div className="flex gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTerminateOthersConfirm(false)}
                                    disabled={terminatingOthers}
                                    className="px-5"
                                  >
                                    {t('settings.accountDeleteCancel')}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleTerminateOthers}
                                    disabled={terminatingOthers}
                                    className="relative px-5"
                                  >
                                    <span className={terminatingOthers ? 'invisible' : ''}>
                                      {t('settings.terminateOthers')}
                                    </span>
                                    {terminatingOthers && <Spinner size="sm" className="text-destructive-foreground absolute" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator />

              <div className="mt-8">
                <div className="mb-4">
                  <Label className="text-sm font-medium">
                    {t('settings.trustedDevices')}
                    {sessionsLoaded && (
                      <span className="ml-1.5 text-muted-foreground">({trustedDevices.length})</span>
                    )}
                  </Label>
                </div>

                {sessionsLoading && !sessionsLoaded ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-black/[0.08] dark:bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : trustedDevices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="flex justify-center mb-3 opacity-50">
                      <ComputerDesktopIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm">{t('settings.noTrustedDevices')}</p>
                  </div>
                ) : (
                  trustedDevices.map((device, index) => {
                    const isCurrentDevice = !!device.device_id && device.device_id === ensureDeviceId();
                    return (
                    <div key={device.id}>
                      {index > 0 && <Separator />}
                      <div className="flex items-start justify-between gap-3 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {device.device_label || t('settings.unknownDevice')}
                            </span>
                            {isCurrentDevice && (
                              <span className="text-xs bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                {t('settings.thisDevice')}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            <div>
                              {device.ip_address}
                              {device.location && <span> · {device.location}</span>}
                            </div>
                            <div>
                              {t('settings.trustedAt')}: {formatDateOnly(device.trusted_at, siteLanguage)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrustedDevice(device.id)}
                          disabled={deletingTrustedId === device.id}
                          className="relative text-red-600 dark:text-red-400 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 flex-shrink-0"
                        >
                          <span className={deletingTrustedId === device.id ? 'invisible' : ''}>
                            {t('settings.deleteTrustedDevice')}
                          </span>
                          {deletingTrustedId === device.id && <Spinner size="sm" className="absolute" />}
                        </Button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {activeTab === 'personal-tokens' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.personalTokens')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.personalTokensDescription')}</p>
              </div>

              <div className="mb-6">
                <div className="flex flex-col gap-3 sm:max-w-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      type="text"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !creatingToken) {
                          handleCreatePersonalToken();
                        }
                      }}
                      placeholder={t('settings.personalTokenNamePlaceholder')}
                      className="flex-1 h-10 rounded-lg px-4 text-sm"
                    />
                    <Button
                      onClick={handleCreatePersonalToken}
                      disabled={creatingToken}
                      className="flex-shrink-0 relative h-10"
                    >
                      <span className={creatingToken ? 'invisible' : ''}>{t('settings.createPersonalToken')}</span>
                      {creatingToken && <Spinner size="sm" className="text-primary-foreground absolute" />}
                    </Button>
                  </div>
                </div>

                {createdToken && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      {t('settings.personalTokenCreated')}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-green-100 dark:bg-green-900/50 px-3 py-2 rounded font-mono break-all text-green-900 dark:text-green-100">
                        {createdToken}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        className="p-2 rounded-lg can-hover:hover:bg-green-200 dark:can-hover:hover:bg-green-800 transition-colors flex-shrink-0"
                      >
                        {copiedToken ? (
                          <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {t('settings.personalTokenOnceWarning')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                {personalTokensLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-black/[0.08] dark:bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : personalTokens.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <KeyIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{t('settings.noPersonalTokens')}</p>
                  </div>
                ) : (
                  personalTokens.map((token, index) => (
                    <div key={token.id}>
                      {index > 0 && <Separator />}
                      <div className="flex items-center justify-between py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{token.name}</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                            {token.token_prefix}...
                          </code>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            {t('settings.personalTokenCreatedAt')}: {formatDateOnly(token.created_at, siteLanguage)}
                          </span>
                          {token.last_used_at && (
                            <span>
                              {t('settings.personalTokenLastUsed')}: {formatDateOnly(token.last_used_at, siteLanguage)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokePersonalToken(token.id)}
                        className="text-red-600 dark:text-red-400 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 flex-shrink-0"
                      >
                        {t('settings.revokePersonalToken')}
                      </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab === 'api-keys' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.apiKeys.title')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.apiKeys.subtitle')}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-medium text-foreground">{t('settings.apiKeys.applicationsTitle')}</h3>
                  <Button
                    variant="default"
                    onClick={() => {
                      if (apiApplications.some(a => a.status === 'pending')) {
                        toast.error(t('settings.apiKeys.toast.pendingExists'));
                        return;
                      }
                      setShowApplyModal(true);
                    }}
                  >
                    {t('settings.apiKeys.applyButton')}
                  </Button>
                </div>

                {apiApplicationsLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-black/[0.08] dark:bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : apiApplications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-border rounded-lg">
                    <p className="text-sm">{t('settings.apiKeys.emptyApplications')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t('settings.apiKeys.modal.serviceName')}</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t('settings.apiKeys.scopesColumn')}</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t('settings.apiKeys.expiration.column')}</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t('settings.apiKeys.statusLabel')}</th>
                          <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">{t('settings.personalTokenCreatedAt')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiApplications.map((app, index) => (
                          <tr
                            key={app.id}
                            className={`cursor-pointer transition-colors can-hover:hover:bg-muted active:bg-muted ${index !== 0 ? 'border-t border-border' : ''}`}
                            onClick={() => setSelectedApplication(app)}
                          >
                            <td className="px-4 py-3 text-center text-muted-foreground">#{app.id}</td>
                            <td className="px-4 py-3 text-center font-medium text-foreground">{app.service_name}</td>
                            <td className="px-4 py-3 text-center">
                              {app.scopes && app.scopes.length > 0 && (
                                <div className="flex gap-1 flex-wrap justify-center">
                                  {app.scopes.map((s) => (
                                    <span key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                              {app.requested_expires_at
                                ? formatDateTime(app.requested_expires_at, siteLanguage)
                                : t('settings.apiKeys.expiration.none')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {app.status === 'cancelled' ? (
                                <span className="text-xs text-muted-foreground">{t('settings.apiKeys.status.cancelled')}</span>
                              ) : (
                                <span className={`text-xs px-2 py-[3px] rounded-full font-medium ${
                                  app.status === 'approved'
                                    ? 'bg-green-600 text-white'
                                    : app.status === 'rejected'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-yellow-600 text-white'
                                }`}>
                                  {t(`settings.apiKeys.status.${app.status}`)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{formatDateTime(app.created_at, siteLanguage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-medium text-foreground mb-3">{t('settings.apiKeys.keysTitle')}</h3>

                {apiKeysLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-black/[0.08] dark:bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-border rounded-lg">
                    <KeyIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{t('settings.apiKeys.emptyKeys')}</p>
                  </div>
                ) : (
                  <div>
                    {apiKeys.map((key, index) => (
                      <div key={key.id}>
                        {index > 0 && <Separator />}
                        <div className="flex items-center justify-between py-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{key.name}</span>
                              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                                {key.token_prefix}...
                              </code>
                            </div>
                            {key.scopes && key.scopes.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {key.scopes.map((s) => (
                                  <span key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{t('settings.personalTokenCreatedAt')}: {formatDateOnly(key.created_at, siteLanguage)}</span>
                              {key.last_used_at && (
                                <span>{t('settings.personalTokenLastUsed')}: {formatDateOnly(key.last_used_at, siteLanguage)}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeKeyId(key.id)}
                            className="text-red-600 dark:text-red-400 can-hover:hover:text-red-600 dark:can-hover:hover:text-red-400 can-hover:hover:bg-red-100/50 dark:can-hover:hover:bg-red-500/15 flex-shrink-0"
                          >
                            {t('settings.apiKeys.revoke.button')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Dialog open={showApplyModal} onOpenChange={(open) => { if (!open && !applySubmitting) clearApplyDraft(); }}>
                <DialogContent
                  className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-10"
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-lg md:text-xl lg:text-2xl">{t('settings.apiKeys.modal.title')}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="apply-service-name" className="text-sm font-medium mb-1.5 block">
                        {t('settings.apiKeys.modal.serviceName')}
                      </Label>
                      <Input
                        id="apply-service-name"
                        type="text"
                        value={applyServiceName}
                        onChange={(e) => setApplyServiceName(e.target.value)}
                        maxLength={255}
                        className="w-full text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="apply-service-url" className="text-sm font-medium mb-1.5 block">
                        {t('settings.apiKeys.modal.serviceUrl')}
                      </Label>
                      <Input
                        id="apply-service-url"
                        type="url"
                        value={applyServiceUrl}
                        onChange={(e) => setApplyServiceUrl(e.target.value)}
                        placeholder="https://"
                        className="w-full text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="apply-purpose" className="text-sm font-medium mb-1.5 block">
                        {t('settings.apiKeys.modal.purpose')}
                      </Label>
                      <textarea
                        id="apply-purpose"
                        value={applyPurpose}
                        onChange={(e) => setApplyPurpose(e.target.value)}
                        rows={4}
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                      <div className="flex justify-between items-center mt-0.5">
                        {applyPurpose.length > 0 && applyPurpose.length < 30 && (
                          <p className="text-xs text-red-500">{t('settings.apiKeys.modal.purposeMinChars')}</p>
                        )}
                        <p className={`text-xs ml-auto ${applyPurpose.length >= 30 ? 'text-muted-foreground' : 'text-red-500'}`}>
                          {applyPurpose.length}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        {t('settings.apiKeys.expiration.label')}
                      </label>
                      <div className="flex flex-wrap items-center gap-[10px]">
                        <Popover open={applyExpirationOpen} onOpenChange={setApplyExpirationOpen}>
                          <PopoverTrigger asChild>
                            <button className="group flex items-center justify-between w-44 h-10 px-2.5 border border-border bg-card text-muted-foreground can-hover:hover:bg-accent active:bg-accent data-[state=open]:bg-accent transition-colors text-sm">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" />
                                <span>{t(`settings.apiKeys.expiration.${applyExpiration}`)}</span>
                              </div>
                              <ChevronDownIcon className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="w-44 p-0 rounded-none border border-border bg-card">
                            <div className="px-2.5 py-1.5 text-xs text-muted-foreground/60">{t('settings.apiKeys.expiration.label')}</div>
                            {(['7d', '30d', '60d', '90d', 'custom', 'none'] as ExpirationOption[]).map((opt) => (
                              <button
                                key={opt}
                                onClick={() => { setApplyExpiration(opt); setApplyExpirationOpen(false); }}
                                className={`w-full flex items-center gap-3 px-2.5 h-10 text-sm transition-colors ${
                                  applyExpiration === opt
                                    ? 'text-foreground'
                                    : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
                                }`}
                              >
                                <CheckIcon className={`w-3.5 h-3.5 flex-shrink-0 ${applyExpiration === opt ? 'opacity-100' : 'opacity-0'}`} />
                                <span>{t(`settings.apiKeys.expiration.${opt}`)}</span>
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                        {applyExpiration === 'custom' && (
                          <input
                            type="date"
                            value={applyCustomDate}
                            onChange={(e) => setApplyCustomDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        {t('settings.apiKeys.modal.scopesLabel')}
                      </label>
                      <div className="space-y-2">
                        {(['read', 'upload', 'delete'] as const).map((s) => (
                          <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={applyScopes.includes(s)} onCheckedChange={() => toggleApplyScope(s)} />
                            <span>{t(`settings.apiKeys.modal.scope.${s}`)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {t('settings.apiKeys.modal.emailNotice', { email: user?.email || '' })}
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={applyTerms}
                        onCheckedChange={(checked) => setApplyTerms(checked === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-foreground">
                        {(() => {
                          const linkText = t('settings.apiKeys.modal.termsLinkText');
                          const fullText = t('settings.apiKeys.modal.termsText');
                          const [before, after] = fullText.split('{link}');
                          return (
                            <>
                              {before}
                              <a
                                href="/api-terms-of-use"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground underline underline-offset-2 decoration-muted-foreground can-hover:hover:decoration-foreground transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {linkText}
                              </a>
                              {after}
                            </>
                          );
                        })()}
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2 mt-6 justify-end">
                    <Button
                      variant="outline"
                      onClick={clearApplyDraft}
                      disabled={applySubmitting}
                    >
                      {t('settings.apiKeys.modal.cancel')}
                    </Button>
                    <Button
                      onClick={handleApplyApiKey}
                      disabled={
                        applySubmitting ||
                        !applyServiceName.trim() ||
                        !applyServiceUrl.trim() ||
                        !(applyServiceUrl.startsWith('http://') || applyServiceUrl.startsWith('https://')) ||
                        applyPurpose.trim().length < 30 ||
                        applyScopes.length === 0 ||
                        !applyTerms ||
                        (applyExpiration === 'custom' && !applyCustomDate)
                      }
                      className="relative"
                    >
                      <span className={applySubmitting ? 'invisible' : ''}>{t('settings.apiKeys.modal.submit')}</span>
                      {applySubmitting && <Spinner size="sm" className="text-primary-foreground absolute" />}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!selectedApplication} onOpenChange={(open) => { if (!open) setSelectedApplication(null); }}>
                <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-10 min-w-0">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-lg md:text-xl lg:text-2xl">{t('settings.apiKeys.detail.title')}</DialogTitle>
                  </DialogHeader>

                  {selectedApplication && (
                    <>
                      <div className="space-y-3 text-sm min-w-0">
                        <div className="break-words">
                          <span className="text-muted-foreground">ID: </span>
                          <span className="text-foreground font-medium">#{selectedApplication.id}</span>
                        </div>
                        <div className="break-words">
                          <span className="text-muted-foreground">{t('settings.apiKeys.modal.serviceName')}: </span>
                          <span className="text-foreground font-medium">{selectedApplication.service_name}</span>
                        </div>
                        <div className="break-words">
                          <span className="text-muted-foreground">{t('settings.apiKeys.modal.serviceUrl')}: </span>
                          <a
                            href={selectedApplication.service_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline break-all"
                          >
                            {selectedApplication.service_url}
                          </a>
                        </div>
                        <div className="break-words">
                          <span className="text-muted-foreground">{t('settings.apiKeys.modal.purpose')}: </span>
                          <span className="text-foreground whitespace-pre-wrap">{selectedApplication.purpose}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t('settings.apiKeys.statusLabel')}: </span>
                          {selectedApplication.status === 'cancelled' ? (
                            <span className="text-xs text-muted-foreground">{t('settings.apiKeys.status.cancelled')}</span>
                          ) : (
                            <span className={`text-xs px-2 py-[3px] rounded-full font-medium ${
                              selectedApplication.status === 'approved'
                                ? 'bg-green-600 text-white'
                                : selectedApplication.status === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'bg-yellow-600 text-white'
                            }`}>
                              {t(`settings.apiKeys.status.${selectedApplication.status}`)}
                            </span>
                          )}
                        </div>
                        {selectedApplication.scopes && selectedApplication.scopes.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">{t('settings.apiKeys.detail.scopes')}: </span>
                            <div className="flex gap-1 flex-wrap">
                              {selectedApplication.scopes.map((s) => (
                                <span key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">{t('settings.personalTokenCreatedAt')}: </span>
                          <span className="text-foreground">{formatDateOnly(selectedApplication.created_at, siteLanguage)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('settings.apiKeys.expiration.label')}: </span>
                          <span className="text-foreground">
                            {selectedApplication.requested_expires_at
                              ? formatDateTime(selectedApplication.requested_expires_at, siteLanguage)
                              : t('settings.apiKeys.expiration.none')}
                          </span>
                        </div>

                        {selectedApplication.status === 'approved' && selectedApplication.api_key_id && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                              {t('settings.apiKeys.detail.issuedKeyId')}
                            </p>
                            <code className="text-sm font-mono text-green-900 dark:text-green-100 break-all">
                              {selectedApplication.api_key_id}
                            </code>
                            <button
                              className="mt-2 text-xs text-green-700 dark:text-green-400 underline block"
                              onClick={() => { setSelectedApplication(null); setActiveTab('api-keys'); }}
                            >
                              → {t('settings.apiKeys.keysTitle')}
                            </button>
                          </div>
                        )}

                        {selectedApplication.status === 'rejected' && selectedApplication.reject_reason && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                              {t('settings.apiKeys.detail.rejectReason')}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-400">
                              {selectedApplication.reject_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedApplication.status === 'pending' && (
                        <div className="mt-6 flex justify-end">
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              if (!window.confirm(t('settings.apiKeys.detail.cancelConfirm'))) return;
                              try {
                                await apiKeyAPI.cancel(selectedApplication.id);
                                setSelectedApplication(null);
                                const applications = await apiKeyAPI.listApplications();
                                setApiApplications(applications);
                                toast.success(t('settings.apiKeys.detail.cancelled'));
                              } catch {
                                toast.error(t('settings.updateFailed'));
                              }
                            }}
                          >
                            {t('settings.apiKeys.detail.cancelButton')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={!!revokeKeyId} onOpenChange={(open) => { if (!open && !revokingKeyId) setRevokeKeyId(null); }}>
                <DialogContent className="w-full max-w-sm sm:max-w-md md:max-w-lg p-6">
                  <DialogHeader className="mb-2">
                    <DialogTitle>{t('settings.apiKeys.revoke.title')}</DialogTitle>
                    <DialogDescription>{t('settings.apiKeys.revoke.confirm')}</DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 justify-end mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setRevokeKeyId(null)}
                      disabled={!!revokingKeyId}
                    >
                      {t('settings.apiKeys.modal.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => revokeKeyId && handleRevokeApiKey(revokeKeyId)}
                      disabled={!!revokingKeyId}
                      className="relative"
                    >
                      <span className={revokingKeyId ? 'invisible' : ''}>{t('settings.apiKeys.revoke.button')}</span>
                      {revokingKeyId && <Spinner size="sm" className="absolute" />}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
