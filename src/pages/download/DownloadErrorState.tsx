import React from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import StatusIcon from '../../components/StatusIcon';

export interface DownloadErrorStateProps {
  errorTitle: string;
  error: string;
  onRetry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const DownloadErrorState: React.FC<DownloadErrorStateProps> = ({
  errorTitle,
  error,
  onRetry,
  t,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <Card className="rounded-3xl border-2 p-8">
          <StatusIcon variant="error" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{errorTitle}</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default DownloadErrorState;
