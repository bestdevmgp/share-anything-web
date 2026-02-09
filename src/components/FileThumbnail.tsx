import React from 'react';
import { useThumbnail } from '../hooks/useThumbnail';
import {
  isImageFile, isPdfFile, isVideoFile, isAudioFile, isTextFile,
  isCsvFile, isExcelFile, isDocxFile, isHwpFile
} from '../utils/format';
import { DocumentIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';

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
      <div className={`${boxClass} flex-shrink-0 bg-gray-100 dark:bg-white/5 rounded flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      </div>
    );
  }

  if ((isImageFile(fileName) || isPdfFile(fileName)) && url) {
    return (
      <img
        src={url}
        alt={fileName}
        className={`${boxClass} object-cover rounded flex-shrink-0`}
      />
    );
  }

  if (isVideoFile(fileName)) {
    if (url) {
      return (
        <div className={`${boxClass} flex-shrink-0 rounded overflow-hidden relative`}>
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
      <div className={`${boxClass} flex-shrink-0 bg-purple-50 dark:bg-purple-500/10 rounded flex items-center justify-center`}>
        <FilmIcon className={`${iconClass} text-purple-600 dark:text-purple-400`} />
      </div>
    );
  }

  if (isAudioFile(fileName)) {
    return (
      <div className={`${boxClass} flex-shrink-0 bg-green-50 dark:bg-green-500/10 rounded flex items-center justify-center`}>
        <MusicalNoteIcon className={`${iconClass} text-green-600 dark:text-green-400`} />
      </div>
    );
  }

  if (isExcelFile(fileName) || isCsvFile(fileName)) {
    return (
      <div className={`${boxClass} flex-shrink-0 bg-green-50 dark:bg-green-500/10 rounded flex items-center justify-center`}>
        <TableCellsIcon className={`${iconClass} text-green-600 dark:text-green-400`} />
      </div>
    );
  }

  if (isDocxFile(fileName)) {
    return (
      <div className={`${boxClass} flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded flex items-center justify-center`}>
        <DocumentTextIcon className={`${iconClass} text-blue-600 dark:text-blue-400`} />
      </div>
    );
  }

  if (isHwpFile(fileName)) {
    return (
      <div className={`${boxClass} flex-shrink-0 bg-sky-50 dark:bg-sky-500/10 rounded flex items-center justify-center`}>
        <DocumentTextIcon className={`${iconClass} text-sky-600 dark:text-sky-400`} />
      </div>
    );
  }

  if (isTextFile(fileName)) {
    return (
      <div className={`${boxClass} flex-shrink-0 bg-yellow-50 dark:bg-yellow-500/10 rounded flex items-center justify-center`}>
        <DocumentTextIcon className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />
      </div>
    );
  }

  return (
    <div className={`${boxClass} flex-shrink-0 bg-gray-100 dark:bg-white/5 rounded flex items-center justify-center`}>
      <DocumentIcon className={`${iconClass} text-gray-400`} />
    </div>
  );
};

export default FileThumbnail;
