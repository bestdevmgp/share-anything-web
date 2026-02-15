import React from 'react';
import { NavigateFunction } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export interface DownloadErrorStateProps {
  errorTitle: string;
  error: string;
  navigate: NavigateFunction;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const DownloadErrorState: React.FC<DownloadErrorStateProps> = ({
  errorTitle,
  error,
  navigate,
  t,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center">
        <Card className="rounded-3xl border-2 p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18L18 6" className="error-x-path-1" />
              <path d="M6 6l12 12" className="error-x-path-2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{errorTitle}</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => navigate('/', { state: { autoFocus: true } })}
          >
            {t('common.retry')}
          </Button>
        </Card>
        <style>{`
          .error-x-path-1,
          .error-x-path-2 {
            stroke-dasharray: 17;
            stroke-dashoffset: 17;
          }
          .error-x-path-1 {
            animation: drawX 0.4s ease-out forwards;
          }
          .error-x-path-2 {
            animation: drawX 0.4s ease-out 0.2s forwards;
          }
          @keyframes drawX {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default DownloadErrorState;
