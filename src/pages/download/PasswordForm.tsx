import React from 'react';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export interface PasswordFormProps {
  password: string;
  showPassword: boolean;
  setPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const PasswordForm: React.FC<PasswordFormProps> = ({
  password,
  showPassword,
  setPassword,
  setShowPassword,
  handlePasswordSubmit,
  t,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <Card className="rounded-3xl border-2 p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-muted rounded-full border border-border flex items-center justify-center mx-auto mb-4">
              <LockClosedIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('download.passwordTitle')}</h1>
            <p className="text-muted-foreground">
              {t('download.passwordProtected')}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-6">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
              data-ph-mask
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('download.passwordPlaceholder')}
                  className="h-12 pr-12 rounded-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground can-hover:hover:text-foreground active:text-foreground"
                >
                  {showPassword ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EyeSlashIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
            >
              {t('common.confirm')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PasswordForm;
