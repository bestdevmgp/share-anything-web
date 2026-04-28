import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { Card, CardContent } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';

type Status = 'revoked' | 'invalid' | 'error';

const parseStatus = (raw: string | null): Status => {
  if (raw === 'revoked' || raw === 'invalid' || raw === 'error') {
    return raw;
  }
  return 'invalid';
};

const DeviceConfirmResultPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const status = parseStatus(searchParams.get('status'));

  useEffect(() => {
    document.title = t('deviceConfirm.pageTitle');
    return () => { document.title = 'ShareAnything'; };
  }, [t]);

  const config = (() => {
    switch (status) {
      case 'revoked':
        return {
          title: t('deviceConfirm.revokedTitle'),
          description: t('deviceConfirm.revokedDescription'),
          iconBg: 'bg-blue-100 dark:bg-blue-500/15',
          icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          ),
          showSettings: true,
        };
      case 'invalid':
        return {
          title: t('deviceConfirm.invalidTitle'),
          description: t('deviceConfirm.invalidDescription'),
          iconBg: 'bg-yellow-100 dark:bg-yellow-500/15',
          icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
          showSettings: false,
        };
      case 'error':
      default:
        return {
          title: t('deviceConfirm.errorTitle'),
          description: t('deviceConfirm.errorDescription'),
          iconBg: 'bg-red-100 dark:bg-red-500/15',
          icon: (
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6" />
              <path d="M6 6l12 12" />
            </svg>
          ),
          showSettings: false,
        };
    }
  })();

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <Card className="rounded-3xl border-2 p-8">
          <CardContent className="p-0">
            <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {config.icon}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>
            <p className="text-muted-foreground text-sm">{config.description}</p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-8">
              <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                {t('deviceConfirm.goHome')}
              </Link>
              {config.showSettings && (
                <Link to="/settings?tab=sessions" className={buttonVariants({ size: 'lg' })}>
                  {t('deviceConfirm.goSettings')}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeviceConfirmResultPage;
