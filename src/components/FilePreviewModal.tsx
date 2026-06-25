import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { DocumentIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatFileSize, isImageFile, isVideoFile, isAudioFile, isTextFile, isPdfFile, isCsvFile, isExcelFile, isDocxFile, isPptxFile, isHwpFile } from '../utils/format';
import { readTextContent, getMediaUrl, getArrayBuffer, generatePptxThumbnail, generateHwpThumbnail } from '../utils/filePreview';
import { fileAPI } from '../services/api';
import { useTranslation } from '../i18n';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { PDF_WORKER_SRC } from '../utils/pdfWorkerSetup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { Separator } from './ui/separator';

interface FilePreviewModalProps {
  file: {
    fileName: string;
    fileSize: number;
    // Either a ready source (File / object URL / public URL)…
    source?: File | string;
    // …or a share code + file id, in which case the modal fetches the file itself
    // (through the proxy) so it can open instantly and show a spinner while loading.
    code?: string;
    fileId?: string;
    password?: string;
    presignedUrl?: string;
  };
  onClose: () => void;
}

// A render crash in a preview (e.g. react-pdf choking on a malformed PDF) must never
// take down the whole app. This boundary contains it and shows a graceful message.
class PreviewErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Preview render crashed:', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { t } = useTranslation();
  const { fileName, fileSize, source, presignedUrl, code, fileId, password } = file;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [excelData, setExcelData] = useState<string[][] | null>(null);
  const [docxReady, setDocxReady] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [hwpText, setHwpText] = useState<string | null>(null);
  const [hwpPreviewImg, setHwpPreviewImg] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfSource, setPdfSource] = useState<File | { url: string } | null>(null);
  const [pdfPageSize, setPdfPageSize] = useState<{ width: number; height: number } | null>(null);
  const [pageRendered, setPageRendered] = useState(false);
  const [mediaImgLoaded, setMediaImgLoaded] = useState(false);
  // Guards the one-shot fallback: if a pre-supplied preview URL fails to load (e.g. it
  // expired), refetch a fresh one via code+fileId exactly once per file.
  const triedRefetchRef = useRef(false);
  useEffect(() => { triedRefetchRef.current = false; }, [source, code, fileId, fileName]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMediaImgLoaded(false);
      try {
        // Resolve the source. Prefer a ready `source` (e.g. an inline preview URL the file
        // list already supplied) so there's NO per-open round-trip. Only when we have no
        // source do we mint one from code+fileId. Either way it resolves to the raw-file
        // INLINE URL (not a downloaded blob): react-pdf streams it page-by-page and other
        // types load it directly — fast, and renders the ORIGINAL bytes (loading a PDF from
        // a proxied blob/object URL made some PDFs render black).
        let src: File | string = (source ?? '') as File | string;
        if (!src && code && fileId) {
          const { download_url } = await fileAPI.getDownloadUrl(code, fileId, password, true);
          if (cancelled) return;
          src = download_url;
        }

        if (isImageFile(fileName)) {
          objectUrl = getMediaUrl(src);
          if (!cancelled) setMediaUrl(objectUrl);
        } else if (isVideoFile(fileName) || isAudioFile(fileName)) {
          if (src instanceof File) {
            objectUrl = URL.createObjectURL(src);
            if (!cancelled) setMediaUrl(objectUrl);
          } else if (!cancelled) {
            // Hand the URL straight to <video>/<audio> so the browser streams it via range
            // requests — playback starts almost instantly instead of waiting for the whole
            // file to download into a blob first.
            setMediaUrl(src as string);
          }
        } else if (isPdfFile(fileName)) {
          if (src instanceof File) {
            if (!cancelled) setPdfSource(src);
          } else {
            if (!cancelled) setPdfSource({ url: src });
          }
        } else if (isCsvFile(fileName)) {
          const text = await readTextContent(src, 100000);
          if (!cancelled) {
            const rows = text.split('\n').filter(r => r.trim()).map(row => {
              const result: string[] = [];
              let current = '';
              let inQuotes = false;
              for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                  inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                  result.push(current.trim());
                  current = '';
                } else {
                  current += char;
                }
              }
              result.push(current.trim());
              return result;
            });
            setCsvData(rows.slice(0, 1000));
          }
        } else if (isExcelFile(fileName)) {
          const XLSX = await import('xlsx');
          const data = await getArrayBuffer(src);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          if (!cancelled) setExcelData((json as string[][]).slice(0, 1000));
        } else if (isPptxFile(fileName)) {
          if (src instanceof File) {
            const thumbUrl = await generatePptxThumbnail(src);
            if (!cancelled && thumbUrl) {
              objectUrl = thumbUrl;
              setMediaUrl(thumbUrl);
            }
          }
        } else if (isDocxFile(fileName)) {
          const { renderAsync } = await import('docx-preview');
          const data = await getArrayBuffer(src);
          if (!cancelled && docxContainerRef.current) {
            await renderAsync(data, docxContainerRef.current, undefined, {
              inWrapper: false,
              ignoreWidth: true,
              ignoreHeight: true,
              ignoreFonts: false,
              breakPages: false,
              ignoreLastRenderedPageBreak: true,
              experimental: false,
              trimXmlDeclaration: true,
              useBase64URL: true,
            });
            setDocxReady(true);
          }
        } else if (isHwpFile(fileName)) {
          const data = await getArrayBuffer(src);
          if (cancelled) return;
          const previewUrl = await generateHwpThumbnail(src);
          if (!cancelled && previewUrl) setHwpPreviewImg(previewUrl);
          let text = '';
          if (fileName.toLowerCase().endsWith('.hwpx')) {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(data);
            const paths: string[] = [];
            zip.forEach((p) => { if (/^Contents\/section\d+\.xml$/i.test(p)) paths.push(p); });
            paths.sort();
            const domParser = new DOMParser();
            const parts: string[] = [];
            for (const p of paths) {
              const f = zip.file(p);
              if (!f) continue;
              const xml = await f.async('text');
              const doc = domParser.parseFromString(xml, 'text/xml');
              const tNodes = Array.from(doc.querySelectorAll('t'));
              parts.push(tNodes.map(t => t.textContent || '').join(''));
            }
            text = parts.join('\n');
          } else {
            const { parseHwpToText } = await import('../utils/hwpParser');
            text = parseHwpToText(new Uint8Array(data));
          }
          if (!cancelled && text.trim()) setHwpText(text.trim());
        } else if (isTextFile(fileName)) {
          const text = await readTextContent(src, 50000);
          if (!cancelled) setTextContent(text);
        }
      } catch (err) {
        console.error('Preview load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source, fileName, code, fileId, password]);

  // Fallback for an expired/failed pre-supplied preview URL: mint a fresh inline URL via
  // code+fileId, at most once per file. Returns null when there's nothing to retry with.
  const refetchFreshUrl = useCallback(async (): Promise<string | null> => {
    if (triedRefetchRef.current || !code || !fileId) return null;
    triedRefetchRef.current = true;
    try {
      const { download_url } = await fileAPI.getDownloadUrl(code, fileId, password, true);
      return download_url;
    } catch {
      return null;
    }
  }, [code, fileId, password]);

  const handleMediaError = useCallback(async () => {
    const fresh = await refetchFreshUrl();
    if (fresh) {
      setMediaImgLoaded(false);
      setMediaUrl(fresh);
    } else {
      setMediaImgLoaded(true);
    }
  }, [refetchFreshUrl]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onPageLoadSuccess = useCallback((page: { width: number; height: number; originalWidth?: number; originalHeight?: number }) => {
    // Capture the page size ONCE, from the intrinsic (scale-independent) dimensions.
    // Using the scaled width/height here fed back into getPdfPageWidth() → re-render →
    // new scaled size → ... an infinite loop ("Maximum update depth exceeded") that froze
    // the whole page (black screen) for PDFs whose dimensions never settled to an exact
    // float match. Setting it once, from the original dims, breaks that feedback entirely.
    setPdfPageSize(prev => prev ?? {
      width: page.originalWidth ?? page.width,
      height: page.originalHeight ?? page.height,
    });
  }, []);

  const getPdfPageWidth = () => {
    const maxWidth = Math.min(600, window.innerWidth - 64);
    if (!pdfPageSize) return maxWidth;
    const availableHeight = window.innerHeight - 260;
    const aspectRatio = pdfPageSize.width / pdfPageSize.height;
    const widthFromHeight = availableHeight * aspectRatio;
    return Math.min(maxWidth, widthFromHeight);
  };

  const getPdfPageHeight = () => {
    if (!pdfPageSize) return undefined;
    const aspectRatio = pdfPageSize.width / pdfPageSize.height;
    return getPdfPageWidth() / aspectRatio;
  };

  const renderTable = (data: string[][]) => (
    <div className="w-full overflow-auto max-h-[calc(100vh-10rem)]">
      <Table className="min-w-full text-sm border-collapse">
        <TableHeader className="sticky top-0">
          <TableRow>
            {(data[0] || []).map((cell, i) => (
              <TableHead key={i} className="bg-muted border border-border px-3 py-2 text-left font-medium text-foreground whitespace-nowrap h-auto">
                {cell}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(1).map((row, ri) => (
            <TableRow key={ri} className="can-hover:hover:bg-muted/50">
              {row.map((cell, ci) => (
                <TableCell key={ci} className="border border-border px-3 py-1.5 text-foreground whitespace-nowrap">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-16 text-muted-foreground text-sm">{t('preview.loading')}</div>
      );
    }

    if (isImageFile(fileName) && mediaUrl) {
      return (
        <>
          {!mediaImgLoaded && (
            <div className="py-16 text-muted-foreground text-sm">{t('preview.loading')}</div>
          )}
          <img
            src={mediaUrl}
            alt={fileName}
            draggable={false}
            onLoad={() => setMediaImgLoaded(true)}
            onError={handleMediaError}
            className={`max-w-full max-h-[calc(100vh-10rem)] object-contain rounded pointer-events-none${mediaImgLoaded ? '' : ' hidden'}`}
          />
        </>
      );
    }

    if (isVideoFile(fileName) && mediaUrl) {
      return <video src={mediaUrl} controls autoPlay playsInline controlsList="nodownload" className="max-w-full max-h-[calc(100vh-10rem)] rounded" onContextMenu={e => e.preventDefault()} onError={handleMediaError} />;
    }

    if (isAudioFile(fileName) && mediaUrl) {
      return <audio src={mediaUrl} controls className="w-full" onError={handleMediaError} />;
    }

    if (isPdfFile(fileName) && pdfSource) {
      GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
      return (
        <div className="flex flex-col items-center w-full">
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={async () => {
              const fresh = await refetchFreshUrl();
              if (fresh) setPdfSource({ url: fresh });
            }}
            loading={
              <div className="py-16 text-muted-foreground text-sm">{t('preview.loading')}</div>
            }
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: getPdfPageWidth(), minHeight: getPdfPageHeight() }}
            >
              <Page
                pageNumber={currentPage}
                width={getPdfPageWidth()}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onLoadSuccess={onPageLoadSuccess}
                onRenderSuccess={() => setPageRendered(true)}
                loading={
                  <div
                    className="bg-white"
                    style={{ width: getPdfPageWidth(), height: getPdfPageHeight() }}
                  />
                }
              />
              {!pageRendered && <div className="absolute inset-0 bg-white" />}
            </div>
          </Document>
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setPageRendered(false); setCurrentPage(p => Math.max(1, p - 1)); }}
                disabled={currentPage <= 1}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setPageRendered(false); setCurrentPage(p => Math.min(numPages, p + 1)); }}
                disabled={currentPage >= numPages}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      );
    }

    if (isPptxFile(fileName)) {
      if (presignedUrl) {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`;
        return (
          <iframe
            src={viewerUrl}
            title={fileName}
            className="w-full rounded border-0"
            style={{ width: Math.min(700, window.innerWidth - 80), height: '70vh' }}
          />
        );
      }
      if (mediaUrl) {
        return <img src={mediaUrl} alt={fileName} draggable={false} className="max-w-full max-h-[calc(100vh-10rem)] object-contain rounded pointer-events-none" />;
      }
    }

    if (isCsvFile(fileName) && csvData) {
      return renderTable(csvData);
    }

    if (isExcelFile(fileName) && excelData) {
      return renderTable(excelData);
    }

    if (isDocxFile(fileName) && docxReady) {
      return null;
    }

    if (isHwpFile(fileName) && (hwpPreviewImg || hwpText)) {
      return (
        <div className="w-full max-h-[calc(100vh-10rem)] overflow-auto">
          {hwpPreviewImg && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border bg-white">
              <img src={hwpPreviewImg} alt={fileName} draggable={false} className="w-full h-auto object-contain pointer-events-none" />
            </div>
          )}
          {hwpText && (
            <div className="bg-muted rounded-xl p-6">
              <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono">{hwpText}</pre>
            </div>
          )}
        </div>
      );
    }

    if (isTextFile(fileName) && textContent !== null) {
      return (
        <div className="w-full max-h-[calc(100vh-10rem)] overflow-auto bg-muted rounded-xl p-6">
          <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <DocumentIcon className="w-16 h-16 mb-3" />
        <p className="text-sm">{t('preview.unsupported')}</p>
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[calc(100vh-6rem)] overflow-hidden p-0 flex flex-col gap-0">
        <DialogHeader className="pl-4 pr-12 pt-[18px] pb-4 flex-shrink-0">
          <DialogTitle className="text-sm font-semibold break-all">{fileName}</DialogTitle>
          <DialogDescription className="text-xs">{formatFileSize(fileSize)}</DialogDescription>
        </DialogHeader>
        <Separator className="flex-shrink-0" />
        <div
          className="px-4 pt-2 pb-4 flex flex-1 min-h-0 overflow-auto select-none"
          style={{ WebkitTouchCallout: 'none' }}
          onContextMenu={e => e.preventDefault()}
          onDragStart={e => e.preventDefault()}
        >
          {isDocxFile(fileName) && (
            <div
              ref={docxContainerRef}
              className="docx-container rounded-md"
              style={{
                visibility: docxReady ? 'visible' : 'hidden',
                position: docxReady ? undefined : 'absolute',
                width: Math.min(600, window.innerWidth - 96),
              }}
            />
          )}
          {!(isDocxFile(fileName) && docxReady) && (
            <div className="m-auto max-w-full">
              <PreviewErrorBoundary
                key={`${fileId ?? ''}:${fileName}`}
                fallback={
                  <div className="flex flex-col items-center py-12 text-muted-foreground">
                    <DocumentIcon className="w-16 h-16 mb-3" />
                    <p className="text-sm">{t('preview.unsupported')}</p>
                  </div>
                }
              >
                {renderContent()}
              </PreviewErrorBoundary>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
