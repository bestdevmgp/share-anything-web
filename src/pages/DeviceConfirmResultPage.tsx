import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'i18n';
import { Card, CardContent } from '../components/ui/card';
import { buttonVariants } from '../components/ui/button';
import { cn } from 'lib/utils';
import StatusIcon, { type StatusIconVariant } from '../components/StatusIcon';

type Status = 'revoked' | 'already' | 'invalid' | 'error';

const parseStatus = (raw: string | null): Status => {
  if (raw === 'revoked' || raw === 'already' || raw === 'invalid' || raw === 'error') {
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

  const config: { title: string; description: string; variant: StatusIconVariant; showSettings: boolean } = (() => {
    switch (status) {
      case 'revoked':
        return {
          title: t('deviceConfirm.revokedTitle'),
          description: t('deviceConfirm.revokedDescription'),
          variant: 'success',
          showSettings: true,
        };
      case 'already':
        return {
          title: t('deviceConfirm.alreadyTitle'),
          description: t('deviceConfirm.alreadyDescription'),
          variant: 'info',
          showSettings: true,
        };
      case 'invalid':
        return {
          title: t('deviceConfirm.invalidTitle'),
          description: t('deviceConfirm.invalidDescription'),
          variant: 'invalid',
          showSettings: false,
        };
      case 'error':
      default:
        return {
          title: t('deviceConfirm.errorTitle'),
          description: t('deviceConfirm.errorDescription'),
          variant: 'error',
          showSettings: false,
        };
    }
  })();

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <Card className="rounded-3xl border-2 p-8">
          <CardContent className="p-0">
            <StatusIcon variant={config.variant} />
            <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>
            <p className="text-muted-foreground text-sm">{config.description}</p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-8">
              <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-4')}>
                {t('deviceConfirm.goHome')}
              </Link>
              {config.showSettings && (
                <Link to="/settings?tab=sessions" className={cn(buttonVariants({ size: 'lg' }), 'px-4')}>
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
