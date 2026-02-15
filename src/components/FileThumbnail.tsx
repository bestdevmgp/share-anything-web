import React from 'react';
import { useThumbnail } from '../hooks/useThumbnail';
import {
  isImageFile, isPdfFile, isVideoFile, isAudioFile, isTextFile,
  isCsvFile, isExcelFile, isDocxFile, isPptxFile, isHwpFile
} from '../utils/format';
import { DocumentIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, TableCellsIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';
import { Spinner } from './ui/spinner';
import { cn } from 'lib/utils';

interface FileThumbnailProps {
  source: File | string | null;
  fileName: string;
  size?: 'sm' | 'md';
  thumbnailWidth?: number;
}

const sizeMap = {
  sm: 'w-11 h-11',
  md: 'w-12 h-12',
};

const iconSizeMap = {
  sm: 'w-7 h-7',
  md: 'w-7 h-7',
};

const FileThumbnail: React.FC<FileThumbnailProps> = ({ source, fileName, size = 'sm', thumbnailWidth }) => {
  const { url, loading } = useThumbnail(source, fileName, thumbnailWidth);
  const boxClass = sizeMap[size];
  const iconClass = iconSizeMap[size];

  if (loading) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-muted rounded flex items-center justify-center')}>
        <Spinner size="default" />
      </div>
    );
  }

  if ((isImageFile(fileName) || isPdfFile(fileName) || isPptxFile(fileName)) && url) {
    return (
      <img
        src={url}
        alt={fileName}
        className={cn(boxClass, 'object-cover rounded flex-shrink-0')}
      />
    );
  }

  if (isVideoFile(fileName)) {
    if (url) {
      return (
        <div className={cn(boxClass, 'flex-shrink-0 rounded overflow-hidden relative')}>
          <img src={url} alt={fileName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg className="w-5 h-5 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-purple-50 dark:bg-purple-500/10 rounded flex items-center justify-center')}>
        <FilmIcon className={cn(iconClass, 'text-purple-600 dark:text-purple-400')} />
      </div>
    );
  }

  if (isAudioFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-green-50 dark:bg-green-500/10 rounded flex items-center justify-center')}>
        <MusicalNoteIcon className={cn(iconClass, 'text-green-600 dark:text-green-400')} />
      </div>
    );
  }

  if (isExcelFile(fileName) || isCsvFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-green-50 dark:bg-green-500/10 rounded flex items-center justify-center')}>
        <TableCellsIcon className={cn(iconClass, 'text-green-600 dark:text-green-400')} />
      </div>
    );
  }

  if (isPptxFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-orange-50 dark:bg-orange-500/10 rounded flex items-center justify-center')}>
        <PresentationChartBarIcon className={cn(iconClass, 'text-orange-600 dark:text-orange-400')} />
      </div>
    );
  }

  if (isDocxFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-muted rounded flex items-center justify-center')}>
        <DocumentTextIcon className={cn(iconClass, 'text-muted-foreground')} />
      </div>
    );
  }

  if (isHwpFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-sky-50 dark:bg-sky-500/10 rounded flex items-center justify-center')}>
        <DocumentTextIcon className={cn(iconClass, 'text-sky-600 dark:text-sky-400')} />
      </div>
    );
  }

  if (isTextFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-yellow-50 dark:bg-yellow-500/10 rounded flex items-center justify-center')}>
        <DocumentTextIcon className={cn(iconClass, 'text-yellow-600 dark:text-yellow-400')} />
      </div>
    );
  }

  return (
    <div className={cn(boxClass, 'flex-shrink-0 bg-muted rounded flex items-center justify-center')}>
      <DocumentIcon className={cn(iconClass, 'text-muted-foreground')} />
    </div>
  );
};

export default FileThumbnail;
