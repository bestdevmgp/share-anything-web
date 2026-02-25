import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'context/ToastContext';
import { useTranslation } from 'i18n';
import { useLanguage } from 'context/LanguageContext';
import { useTheme } from 'context/ThemeContext';
import { userAPI } from 'services/api';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import { Separator } from 'components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { GlobeAltIcon, SunIcon, MoonIcon, ComputerDesktopIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

type Tab = 'notifications' | 'general';

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

  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyDownload, setNotifyDownload] = useState(true);
  const [notifyDownloadAlert, setNotifyDownloadAlert] = useState(true);
  const [notifyLanguage, setNotifyLanguage] = useState('ko');
  const [loading, setLoading] = useState(true);

  const [notifyLangOpen, setNotifyLangOpen] = useState(false);
  const [siteLangOpen, setSiteLangOpen] = useState(false);
  const [siteThemeOpen, setSiteThemeOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentNotifyLang = langOptions.find((o) => o.key === notifyLanguage) || langOptions[0];
  const currentSiteLang = langOptions.find((o) => o.key === siteLanguage)!;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-foreground mb-8">{t('settings.pageTitle')}</h1>

      <div className="flex flex-col md:flex-row gap-0">
        {/* Sidebar */}
        <div className="md:w-52 flex-shrink-0 md:pr-8 md:border-r md:border-border pb-4 md:pb-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.notifications')}
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground can-hover:hover:bg-accent active:bg-accent'
              }`}
            >
              {t('settings.general')}
            </button>
          </nav>
          {/* Mobile separator */}
          <Separator className="md:hidden mt-4" />
        </div>

        {/* Content */}
        <div className="flex-1 md:pl-10 pt-4 md:pt-0">
          {activeTab === 'notifications' && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{t('settings.notificationSettings')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.notificationDescription')}</p>
              </div>

              <div className="space-y-6">
                {/* Upload Notification */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.uploadNotification')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.uploadNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={notifyUpload}
                    onCheckedChange={(checked) => handleToggle('upload', checked)}
                  />
                </div>

                <Separator />

                {/* Download Notification */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.downloadNotification')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.downloadNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={notifyDownload}
                    onCheckedChange={(checked) => handleToggle('download', checked)}
                  />
                </div>

                <Separator />

                {/* Download Alert Notification */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.downloadAlertNotification')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.downloadAlertNotificationDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={notifyDownloadAlert}
                    onCheckedChange={(checked) => handleToggle('downloadAlert', checked)}
                  />
                </div>

                <Separator />

                {/* Notification Language */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.notifyLanguage')}</Label>
                    <p className="text-sm text-muted-foreground">
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
                <h2 className="text-lg font-semibold text-foreground">{t('settings.generalSettings')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('settings.generalDescription')}</p>
              </div>

              <div className="space-y-6">
                {/* Site Language */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.siteLanguage')}</Label>
                    <p className="text-sm text-muted-foreground">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t('settings.siteTheme')}</Label>
                    <p className="text-sm text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
