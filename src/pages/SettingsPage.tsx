import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'context/ToastContext';
import { useTranslation } from 'i18n';
import { userAPI } from 'services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card';
import { Switch } from 'components/ui/switch';
import { Label } from 'components/ui/label';
import { Separator } from 'components/ui/separator';
import { BellIcon } from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [notifyUpload, setNotifyUpload] = useState(true);
  const [notifyDownload, setNotifyDownload] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    const fetchSettings = async () => {
      try {
        const settings = await userAPI.getNotificationSettings();
        setNotifyUpload(settings.notify_upload);
        setNotifyDownload(settings.notify_download);
      } catch {
        toast.error(t('settings.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isAuthenticated, navigate, t]);

  const handleToggle = async (field: 'upload' | 'download', value: boolean) => {
    const prevUpload = notifyUpload;
    const prevDownload = notifyDownload;

    // Optimistic update
    if (field === 'upload') {
      setNotifyUpload(value);
    } else {
      setNotifyDownload(value);
    }

    try {
      await userAPI.updateNotificationSettings({
        notify_upload: field === 'upload' ? value : notifyUpload,
        notify_download: field === 'download' ? value : notifyDownload,
      });
      toast.success(t('settings.updateSuccess'));
    } catch {
      // Rollback
      setNotifyUpload(prevUpload);
      setNotifyDownload(prevDownload);
      toast.error(t('settings.updateFailed'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-24" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('settings.pageTitle')}</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-48 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-accent rounded-lg">
                <BellIcon className="w-4 h-4" />
                {t('settings.notifications')}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('settings.notificationSettings')}</CardTitle>
              <CardDescription>{t('settings.notificationDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Notification */}
              <div className="flex items-center justify-between">
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
              <div className="flex items-center justify-between">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
