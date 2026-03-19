import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'context/ToastContext';
import { useTranslation } from 'i18n';
import { useLanguage } from 'context/LanguageContext';
import { useTheme } from 'context/ThemeContext';
import { userAPI, apiKeyAPI } from 'services/api';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import { Separator } from 'components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { GlobeAltIcon, SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentIcon, KeyIcon } from '@heroicons/react/24/outline';

type Tab = 'notifications' | 'general' | 'api-keys';

interface ApiKeyItem {
  id: string;
  key_prefix: string;
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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language: siteLanguage, setLanguage: setSiteLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: Tab = (tabParam === 'general' ? 'general' : tabParam === 'api-keys' ? 'api-keys' : 'notifications');
  const setActiveTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyDownload, setNotifyDownload] = useState(true);
  const [notifyDownloadAlert, setNotifyDownloadAlert] = useState(true);
  const [notifyLanguage, setNotifyLanguage] = useState('ko');
  const [loading, setLoading] = useState(true);

  const [notifyLangOpen, setNotifyLangOpen] = useState(false);
  const [siteLangOpen, setSiteLangOpen] = useState(false);
  const [siteThemeOpen, setSiteThemeOpen] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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
        setNotifyLanguage(settings.notify_language);
      } catch {
        toast.error(t('settings.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();

    const fetchApiKeys = async () => {
      setApiKeysLoading(true);
      try {
        const keys = await apiKeyAPI.list();
        setApiKeys(keys);
      } catch {
        // Silently fail - user can retry
      } finally {
        setApiKeysLoading(false);
      }
    };
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, navigate]);

  const handleToggle = async (field: 'upload' | 'download' | 'downloadAlert', value: boolean) => {
    const prevUpload = notifyUpload;
    const prevDownload = notifyDownload;
    const prevDownloadAlert = notifyDownloadAlert;

    // Optimistic update
    if (field === 'upload') {
      setNotifyUpload(value);
    } else if (field === 'download') {
      setNotifyDownload(value);
    } else {
      setNotifyDownloadAlert(value);
    }

    try {
      await userAPI.updateNotificationSettings({
        notify_upload: field === 'upload' ? value : notifyUpload,
        notify_download: field === 'download' ? value : notifyDownload,
        notify_download_alert: field === 'downloadAlert' ? value : notifyDownloadAlert,
        notify_language: notifyLanguage,
      });
      toast.success(t('settings.updateSuccess'));
    } catch {
      // Rollback
      setNotifyUpload(prevUpload);
      setNotifyDownload(prevDownload);
      setNotifyDownloadAlert(prevDownloadAlert);
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
        notify_language: newLang,
      });
      toast.success(t('settings.updateSuccess'));
    } catch {
      setNotifyLanguage(prevLang);
      toast.error(t('settings.updateFailed'));
    }
  };

  const handleCreateApiKey = async () => {
    setCreatingKey(true);
    try {
      const result = await apiKeyAPI.generate(newKeyName || undefined);
      setCreatedKey(result.api_key);
      setNewKeyName('');
      const keys = await apiKeyAPI.list();
      setApiKeys(keys);
    } catch {
      toast.error(t('settings.apiKeyCreateFailed'));
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      await apiKeyAPI.revoke(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      toast.success(t('settings.apiKeyRevoked'));
    } catch {
      toast.error(t('settings.apiKeyRevokeFailed'));
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="animate-pulse">
          {/* Title */}
          <div className="h-8 bg-muted rounded w-20 mb-8" />

          <div className="flex flex-col md:flex-row gap-0">
            {/* Sidebar skeleton */}
            <div className="md:w-52 flex-shrink-0 md:pr-8 md:border-r md:border-border pb-4 md:pb-0">
              <div className="flex gap-2 md:flex-col md:gap-2">
                <div className="h-9 bg-muted rounded-lg w-16 md:w-full" />
                <div className="h-9 bg-muted rounded-lg w-12 md:w-full" />
              </div>
              <Separator className="md:hidden mt-4" />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 md:pl-10 pt-4 md:pt-0 space-y-6">
              {/* Section header */}
              <div>
                <div className="h-6 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-56" />
              </div>

              {/* Setting rows */}
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Separator />
                  <div className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-6 w-11 bg-muted rounded-full" />
                    </div>
                    <div className="h-4 bg-muted rounded w-48 mt-2" />
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
        {/* Sidebar / Mobile Tabs */}
        <div className="md:w-52 flex-shrink-0 md:pr-8 md:border-r md:border-border pb-4 md:pb-0">
          <nav className="flex gap-2 md:flex-col md:space-y-1 md:gap-0">
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
              onClick={() => setActiveTab('api-keys')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors md:w-full md:text-left ${
                activeTab === 'api-keys'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.apiKeys')}
            </button>
          </nav>
          <Separator className="md:hidden mt-4" />
        </div>

        {/* Content */}
        <div className="flex-1 md:pl-10 pt-4 md:pt-0">
          {activeTab === 'notifications' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.notifications')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.notificationDescription')}</p>
              </div>

              <div className="space-y-6">
                {/* Upload Notification */}
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

                {/* Download Notification */}
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

                {/* Download Alert Notification */}
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

                {/* Notification Language */}
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
                {/* Site Language */}
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

                {/* Site Theme */}
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
          {activeTab === 'api-keys' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.apiKeys')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.apiKeysDescription')}</p>
              </div>

              {/* Create new key */}
              <div className="mb-6 p-4 border border-border rounded-lg">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t('settings.apiKeyNamePlaceholder')}
                    className="flex-1 h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleCreateApiKey}
                    disabled={creatingKey}
                    className="h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium can-hover:hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {creatingKey ? t('common.loading') : t('settings.createApiKey')}
                  </button>
                </div>

                {/* Show newly created key */}
                {createdKey && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      {t('settings.apiKeyCreated')}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-green-100 dark:bg-green-900/50 px-3 py-2 rounded font-mono break-all text-green-900 dark:text-green-100">
                        {createdKey}
                      </code>
                      <button
                        onClick={handleCopyKey}
                        className="p-2 rounded-lg can-hover:hover:bg-green-200 dark:can-hover:hover:bg-green-800 transition-colors flex-shrink-0"
                      >
                        {copiedKey ? (
                          <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {t('settings.apiKeyOnceWarning')}
                    </p>
                  </div>
                )}
              </div>

              {/* Key list */}
              <div className="space-y-3">
                {apiKeysLoading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <KeyIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('settings.noApiKeys')}</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{key.name}</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                            {key.key_prefix}...
                          </code>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            {t('settings.apiKeyCreatedAt')}: {new Date(key.created_at).toLocaleDateString()}
                          </span>
                          {key.last_used_at && (
                            <span>
                              {t('settings.apiKeyLastUsed')}: {new Date(key.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeApiKey(key.id)}
                        className="text-xs text-red-600 dark:text-red-400 font-medium can-hover:hover:bg-red-50 dark:can-hover:hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        {t('settings.revokeApiKey')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
