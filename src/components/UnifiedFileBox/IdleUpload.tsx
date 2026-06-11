import React from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { cn } from '../../lib/utils';

interface Props {
  onNormal: (files: File[]) => void;
  onSecure: (files: File[]) => void;
}

const IdleUpload: React.FC<Props> = ({ onNormal, onSecure }) => {
  const { t } = useTranslation();

  const normalDz = useDropzone({ onDrop: onNormal, multiple: true });
  const secureDz = useDropzone({ onDrop: onSecure, multiple: true });

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <div
        {...normalDz.getRootProps()}
        className={cn(
          'flex-1 flex flex-col items-center justify-center px-4 py-6 cursor-pointer transition-colors',
          'border-b md:border-b-0 md:border-r border-foreground/[0.09]',
          normalDz.isDragActive
            ? 'bg-primary/10'
            : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
        )}
      >
        <input {...normalDz.getInputProps()} />
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
      <div
        {...secureDz.getRootProps()}
        className={cn(
          'flex-1 flex flex-col items-center justify-center px-4 py-6 cursor-pointer transition-colors',
          secureDz.isDragActive
            ? 'bg-primary/10'
            : 'can-hover:hover:bg-foreground/5 active:bg-foreground/5'
        )}
      >
        <input {...secureDz.getInputProps()} />
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
    </div>
  );
};

export default IdleUpload;
