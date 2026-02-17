import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { cn } from 'lib/utils';
import { useTranslation } from '../../i18n';
import { ExpirationOption } from '../../types';

export interface TransferSettingsProps {
  transferType: 'server' | 'p2p';
  isAuthenticated: boolean;
  expiration: ExpirationOption;
  onExpirationChange: (value: ExpirationOption) => void;
  isOneTime: boolean;
  onIsOneTimeChange: (checked: boolean) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onShowPasswordToggle: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  expirationOptions: { value: ExpirationOption; label: string }[];
}

const TransferSettings: React.FC<TransferSettingsProps> = ({
  transferType,
  isAuthenticated,
  expiration,
  onExpirationChange,
  isOneTime,
  onIsOneTimeChange,
  password,
  onPasswordChange,
  showPassword,
  onShowPasswordToggle,
  description,
  onDescriptionChange,
  expirationOptions,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-5">{t('upload.transferSettings')}</h2>

      {transferType !== 'p2p' && (
        <div className="mb-8">
          <h3 className={cn('text-base font-semibold text-foreground', !isAuthenticated ? 'mb-1' : 'mb-4')}>{t('upload.expiration')}</h3>
          {!isAuthenticated && (
            <p className="mb-4 text-sm text-muted-foreground">
              {t('upload.loginRequired')}
            </p>
          )}
          <div className="flex flex-wrap gap-2 md:gap-2.5 mb-4">
            {expirationOptions.map(option => (
              <Button
                key={option.value}
                variant={expiration === option.value ? 'default' : 'secondary'}
                size="xl"
                onClick={() => onExpirationChange(option.value)}
                disabled={!isAuthenticated && option.value !== 'five_minutes'}
                className={expiration === option.value ? 'border border-transparent' : ''}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {isAuthenticated && (
            <div className="mt-4">
              <div className="flex items-center">
                <Checkbox
                  id="one-time-download"
                  checked={isOneTime}
                  onCheckedChange={(checked) => onIsOneTimeChange(checked === true)}
                  className="h-6 w-6 rounded-md border-2"
                />
                <label
                  htmlFor="one-time-download"
                  className="ml-2.5 text-base font-medium cursor-pointer text-foreground"
                >
                  {t('upload.oneTimeDownload')}
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-base font-semibold text-foreground mb-4">
          {t('upload.password')} <span className="text-sm text-muted-foreground/60 font-normal">{t('common.optional')}</span>
        </h3>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={!isAuthenticated}
            placeholder={isAuthenticated ? t('upload.passwordPlaceholder') : t('upload.passwordPlaceholderDisabled')}
            className="w-full h-12 px-4 pr-12 border border-input bg-card text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:bg-muted disabled:text-muted-foreground"
          />
          {isAuthenticated ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onShowPasswordToggle}
              className="absolute right-[5px] top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? (
                <EyeIcon className="w-5 h-5" />
              ) : (
                <EyeSlashIcon className="w-5 h-5" />
              )}
            </Button>
          ) : (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">
          {t('upload.description')} <span className="text-sm text-muted-foreground/60 font-normal">{t('common.optional')}</span>
        </h3>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('upload.descriptionPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 border border-input bg-card text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
};

export default TransferSettings;
