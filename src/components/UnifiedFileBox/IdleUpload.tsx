import React, { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, FolderPlusIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import {
  getFilesWithPaths,
  consumeEmptyFolders,
  supportsDirectoryPicker,
  pickDirectoryWithEmpties,
} from '../../utils/dropzoneFiles';

interface Props {
  onNormal: (files: File[], emptyFolders: string[]) => void;
  onSecure: (files: File[], emptyFolders: string[]) => void;
  animateIn?: boolean;
}

const folderButtonClass =
  'mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/70 can-hover:hover:text-foreground can-hover:hover:bg-foreground/10 active:text-foreground active:bg-foreground/10 transition-colors';

const IdleUpload: React.FC<Props> = ({ onNormal, onSecure, animateIn }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [enterAnim] = useState(
    animateIn ? 'animate-in fade-in-0 slide-in-from-top-2 duration-300' : ''
  );
  const normalFolderInputRef = useRef<HTMLInputElement>(null);
  const secureFolderInputRef = useRef<HTMLInputElement>(null);

  const handleNormalDrop = useCallback(
    (files: File[]) => onNormal(files, consumeEmptyFolders()),
    [onNormal]
  );
  const handleSecureDrop = useCallback(
    (files: File[]) => onSecure(files, consumeEmptyFolders()),
    [onSecure]
  );

  const normalDz = useDropzone({ onDrop: handleNormalDrop, multiple: true, getFilesFromEvent: getFilesWithPaths });
  const secureDz = useDropzone({ onDrop: handleSecureDrop, multiple: true, getFilesFromEvent: getFilesWithPaths });

  const selectFolder = useCallback(
    async (
      forward: (files: File[], emptyFolders: string[]) => void,
      inputRef: React.RefObject<HTMLInputElement | null>
    ) => {
      if (supportsDirectoryPicker()) {
        const picked = await pickDirectoryWithEmpties();
        if (picked) forward(picked.files, picked.emptyFolders);
        return;
      }
      inputRef.current?.click();
    },
    []
  );

  const handleFolderInputChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      forward: (files: File[], emptyFolders: string[]) => void
    ) => {
      const picked = e.target.files ? Array.from(e.target.files) : [];
      const accepted = await getFilesWithPaths({ target: { files: picked } } as any);
      e.target.value = '';
      if (accepted.length === 0) {
        toast.warning(t('upload.emptyFolder'));
        return;
      }
      forward(accepted, consumeEmptyFolders());
    },
    [t]
  );

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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              selectFolder(onNormal, normalFolderInputRef);
            }}
            className={folderButtonClass}
          >
            <FolderPlusIcon className="w-4 h-4" />
            {t('upload.selectFolder')}
          </button>
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              selectFolder(onSecure, secureFolderInputRef);
            }}
            className={folderButtonClass}
          >
            <FolderPlusIcon className="w-4 h-4" />
            {t('upload.selectFolder')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground/60 text-center max-w-[250px]">
          {t('upload.p2pSizeNotice')}
        </p>
      </div>
      <input
        ref={normalFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard but widely supported directory attrs
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={(e) => handleFolderInputChange(e, onNormal)}
      />
      <input
        ref={secureFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard but widely supported directory attrs
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={(e) => handleFolderInputChange(e, onSecure)}
      />
    </div>
  );
};

export default IdleUpload;
