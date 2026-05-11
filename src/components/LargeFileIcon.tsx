import React from 'react';
import {
  DocumentIcon,
  DocumentTextIcon,
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import {
  isImageFile,
  isPdfFile,
  isVideoFile,
  isAudioFile,
  isTextFile,
  isCsvFile,
  isExcelFile,
  isDocxFile,
  isPptxFile,
  isHwpFile,
} from '../utils/format';
import { cn } from 'lib/utils';

interface Props {
  fileName: string;
  className?: string;
}

const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz']);
const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp',
  'rb', 'php', 'swift', 'kt', 'sh', 'sql', 'css', 'scss', 'html', 'xml',
  'yaml', 'yml', 'json',
]);

const getExtension = (name: string): string => {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
};

type Style = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bg: string;
  ring: string;
  iconColor: string;
  badge: string;
};

const STYLES: Record<string, Style> = {
  image: {
    Icon: PhotoIcon,
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    ring: 'ring-pink-200/70 dark:ring-pink-500/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  },
  pdf: {
    Icon: DocumentTextIcon,
    bg: 'bg-red-50 dark:bg-red-500/10',
    ring: 'ring-red-200/70 dark:ring-red-500/30',
    iconColor: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  video: {
    Icon: FilmIcon,
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    ring: 'ring-purple-200/70 dark:ring-purple-500/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  },
  audio: {
    Icon: MusicalNoteIcon,
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-200/70 dark:ring-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  sheet: {
    Icon: TableCellsIcon,
    bg: 'bg-green-50 dark:bg-green-500/10',
    ring: 'ring-green-200/70 dark:ring-green-500/30',
    iconColor: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  },
  slides: {
    Icon: PresentationChartBarIcon,
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    ring: 'ring-orange-200/70 dark:ring-orange-500/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  },
  doc: {
    Icon: DocumentTextIcon,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    ring: 'ring-blue-200/70 dark:ring-blue-500/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  },
  text: {
    Icon: DocumentTextIcon,
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    ring: 'ring-yellow-200/70 dark:ring-yellow-500/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
  },
  code: {
    Icon: CodeBracketIcon,
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    ring: 'ring-sky-200/70 dark:ring-sky-500/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  archive: {
    Icon: ArchiveBoxIcon,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-200/70 dark:ring-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  default: {
    Icon: DocumentIcon,
    bg: 'bg-muted',
    ring: 'ring-border',
    iconColor: 'text-muted-foreground',
    badge: 'bg-background text-muted-foreground border border-border',
  },
};

const getStyleKey = (fileName: string): keyof typeof STYLES => {
  if (isImageFile(fileName)) return 'image';
  if (isPdfFile(fileName)) return 'pdf';
  if (isVideoFile(fileName)) return 'video';
  if (isAudioFile(fileName)) return 'audio';
  if (isCsvFile(fileName) || isExcelFile(fileName)) return 'sheet';
  if (isPptxFile(fileName)) return 'slides';
  if (isDocxFile(fileName) || isHwpFile(fileName)) return 'doc';
  const ext = getExtension(fileName);
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archive';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (isTextFile(fileName)) return 'text';
  return 'default';
};

const LargeFileIcon: React.FC<Props> = ({ fileName, className }) => {
  const style = STYLES[getStyleKey(fileName)];
  const ext = getExtension(fileName);
  const { Icon } = style;

  return (
    <div
      className={cn(
        'relative w-40 h-40 rounded-2xl flex flex-col items-center justify-center gap-3 ring-1 ring-inset shadow-sm',
        style.bg,
        style.ring,
        className,
      )}
    >
      <Icon className={cn('w-16 h-16', style.iconColor)} strokeWidth={1.25} />
      {ext && (
        <span
          className={cn(
            'px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider leading-none',
            style.badge,
          )}
        >
          {ext}
        </span>
      )}
    </div>
  );
};

export default LargeFileIcon;
