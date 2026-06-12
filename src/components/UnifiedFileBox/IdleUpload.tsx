import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface Props {
  onNormal: (files: File[]) => void;
  onSecure: (files: File[]) => void;
  animateIn?: boolean;
}

const IdleUpload: React.FC<Props> = ({ onNormal, onSecure, animateIn }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [enterAnim] = useState(
    animateIn ? 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300' : ''
  );

  const normalDz = useDropzone({ onDrop: onNormal, multiple: true });
  const secureDz = useDropzone({ onDrop: onSecure, multiple: true });

  return (
    <div className={cn('flex-1 flex flex-col md:flex-row', enterAnim)}>
      <div
        {...normalDz.getRootProps()}
        className={cn(
          'flex-1 flex flex-col items-center px-4 py-6 cursor-pointer transition-colors',
          'border-b md:border-b-0 md:border-r border-foreground/[0.09]',
          normalDz.isDragActive
            ? 'bg-primary/10'
            : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
        )}
      >
        <input {...normalDz.getInputProps()} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <ArrowUpTrayIcon
            className="w-16 h-16 md:w-20 md:h-20 text-primary mb-4"
            strokeWidth={2.5}
          />
          <p className="text-lg md:text-xl text-foreground font-semibold mb-1.5">
            {t('unifiedBox.transferNormal')}
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[250px] min-h-[2.85rem]">
            {t('unifiedBox.normalDescription')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center max-w-[250px]">
          {isAuthenticated ? t('upload.maxSizeNotice') : t('upload.maxSizeNoticeGuest1')}
        </p>
      </div>
      <div
        {...secureDz.getRootProps()}
        className={cn(
          'flex-1 flex flex-col items-center px-4 py-6 cursor-pointer transition-colors',
          secureDz.isDragActive
            ? 'bg-primary/10'
            : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
        )}
      >
        <input {...secureDz.getInputProps()} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <LockClosedIcon
            className="w-16 h-16 md:w-20 md:h-20 text-foreground mb-4 scale-[0.92]"
            strokeWidth={2.5}
          />
          <p className="text-lg md:text-xl text-foreground font-semibold mb-1.5">
            {t('unifiedBox.transferSecure')}
          </p>
          <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[250px] min-h-[2.85rem]">
            {t('unifiedBox.secureDescription')}
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center max-w-[250px]">
          {t('upload.p2pSizeNotice')}
        </p>
      </div>
    </div>
  );
};

export default IdleUpload;
