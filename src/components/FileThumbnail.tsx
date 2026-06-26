import React, { useEffect, useRef, useState } from 'react';
import { useThumbnail } from '../hooks/useThumbnail';
import {
  isImageFile, isPdfFile, isVideoFile, isAudioFile, isTextFile,
  isCsvFile, isExcelFile, isDocxFile, isPptxFile, isHwpFile
} from '../utils/format';
import { getArrayBuffer } from '../utils/filePreview';
import { sanitizeRenderedDocx } from '../utils/sanitizeDocx';
import { DocumentIcon, FilmIcon, MusicalNoteIcon, DocumentTextIcon, TableCellsIcon, PresentationChartBarIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Spinner } from './ui/spinner';
import { cn } from 'lib/utils';

interface FileThumbnailProps {
  source: File | string | null;
  fileName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  thumbnailWidth?: number;
}

const sizeMap = {
  xs: 'w-9 h-9',
  sm: 'w-11 h-11',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const sizePx = {
  xs: 36,
  sm: 44,
  md: 48,
  lg: 64,
};

const iconSizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-7 h-7',
  md: 'w-7 h-7',
  lg: 'w-8 h-8',
};

const docxHtmlCache = new Map<string, string>();

function getDocxCacheKey(source: File | string): string {
  if (source instanceof File) {
    return `docx:${source.name}:${source.size}:${source.lastModified}`;
  }
  return `docx:${source}`;
}

const DocxMiniPreview: React.FC<{ source: File | string; boxClass: string; boxPx: number }> = ({ source, boxPx, boxClass }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const el = containerRef.current;
      if (!el) return;

      const cacheKey = getDocxCacheKey(source);
      const cached = docxHtmlCache.get(cacheKey);

      if (cached) {
        el.innerHTML = cached;
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const { renderAsync } = await import('docx-preview');
        const data = await getArrayBuffer(source);
        if (cancelled) return;

        await renderAsync(data, el, undefined, {
          inWrapper: false,
          ignoreFonts: true,
          breakPages: false,
          useBase64URL: true,
          ignoreWidth: true,
          ignoreHeight: true,
          renderAltChunks: false,
        });

        sanitizeRenderedDocx(el);
        docxHtmlCache.set(cacheKey, el.innerHTML);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [source]);

  if (failed) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded flex items-center justify-center')}>
        <DocumentTextIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  const renderWidth = 440;
  const scale = boxPx / renderWidth;
  const renderHeight = boxPx / scale;

  return (
    <div className={cn(boxClass, 'flex-shrink-0 rounded overflow-hidden relative bg-white')} >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
          <Spinner size="default" />
        </div>
      )}
      <div
        ref={containerRef}
        className="docx-thumb-container"
        style={{
          width: renderWidth,
          height: renderHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          pointerEvents: 'none',
          paddingTop: 0,
          visibility: ready ? 'visible' : 'hidden',
        }}
      />
    </div>
  );
};

const FileThumbnail: React.FC<FileThumbnailProps> = ({ source, fileName, size = 'sm', thumbnailWidth }) => {
  const { url, loading } = useThumbnail(source, fileName, thumbnailWidth);
  const boxClass = sizeMap[size];
  const boxPx = sizePx[size];
  const iconClass = iconSizeMap[size];

  if (loading) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-muted rounded flex items-center justify-center')}>
        <Spinner size="default" />
      </div>
    );
  }

  if ((isImageFile(fileName) || isPdfFile(fileName) || isPptxFile(fileName) || isHwpFile(fileName)) && url) {
    return (
      <img
        src={url}
        alt={fileName}
        className={cn(boxClass, 'object-cover rounded flex-shrink-0')}
      />
    );
  }

  if (isImageFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-muted rounded flex items-center justify-center')}>
        <PhotoIcon className={cn(iconClass, 'text-muted-foreground')} />
      </div>
    );
  }

  if (isPdfFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-red-50 dark:bg-red-500/10 rounded flex items-center justify-center')}>
        <DocumentIcon className={cn(iconClass, 'text-red-600 dark:text-red-400')} />
      </div>
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

  if (isDocxFile(fileName) && source) {
    return <DocxMiniPreview source={source} boxClass={boxClass} boxPx={boxPx} />;
  }

  if (isDocxFile(fileName)) {
    return (
      <div className={cn(boxClass, 'flex-shrink-0 bg-blue-50 dark:bg-blue-500/10 rounded flex items-center justify-center')}>
        <DocumentTextIcon className={cn(iconClass, 'text-blue-600 dark:text-blue-400')} />
      </div>
    );
  }

  if (isHwpFile(fileName) && !url) {
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
