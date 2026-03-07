import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { DocumentIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatFileSize, isImageFile, isVideoFile, isAudioFile, isTextFile, isPdfFile, isCsvFile, isExcelFile, isDocxFile, isPptxFile, isHwpFile } from '../utils/format';
import { readTextContent, getMediaUrl, getArrayBuffer, generatePptxThumbnail } from '../utils/filePreview';
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
import { Spinner } from './ui/spinner';
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
    source: File | string;
    presignedUrl?: string;
  };
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { t } = useTranslation();
  const { fileName, fileSize, source, presignedUrl } = file;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [excelData, setExcelData] = useState<string[][] | null>(null);
  const [docxReady, setDocxReady] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfSource, setPdfSource] = useState<File | { url: string } | null>(null);
  const [pdfPageSize, setPdfPageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (isImageFile(fileName)) {
          objectUrl = getMediaUrl(source);
          if (!cancelled) setMediaUrl(objectUrl);
        } else if (isVideoFile(fileName) || isAudioFile(fileName)) {
          if (source instanceof File) {
            objectUrl = URL.createObjectURL(source);
          } else if (typeof source === 'string' && source.startsWith('blob:')) {
            objectUrl = source;
          } else {
            const res = await fetch(source as string);
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);
          }
          if (!cancelled) setMediaUrl(objectUrl);
        } else if (isPdfFile(fileName)) {
          if (source instanceof File) {
            if (!cancelled) setPdfSource(source);
          } else {
            if (!cancelled) setPdfSource({ url: source });
          }
        } else if (isCsvFile(fileName)) {
          const text = await readTextContent(source, 100000);
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
          const data = await getArrayBuffer(source);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
          if (!cancelled) setExcelData((json as string[][]).slice(0, 1000));
        } else if (isPptxFile(fileName)) {
          if (source instanceof File) {
            const thumbUrl = await generatePptxThumbnail(source);
            if (!cancelled && thumbUrl) {
              objectUrl = thumbUrl;
              setMediaUrl(thumbUrl);
            }
          }
        } else if (isDocxFile(fileName)) {
          const { renderAsync } = await import('docx-preview');
          const data = await getArrayBuffer(source);
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
        } else if (isTextFile(fileName)) {
          const text = await readTextContent(source, 50000);
          if (!cancelled) setTextContent(text);
        } else {
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
  }, [source, fileName]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onPageLoadSuccess = useCallback((page: { width: number; height: number }) => {
    if (!pdfPageSize) {
      setPdfPageSize({ width: page.width, height: page.height });
    }
  }, [pdfPageSize]);

  const getPdfPageWidth = () => {
    const maxWidth = Math.min(600, window.innerWidth - 64);
    if (!pdfPageSize) return maxWidth;
    // modal margin(64) + header(74) + separator(1) + content padding(32) + pagination(56) + safety(33)
    const availableHeight = window.innerHeight - 260;
    const aspectRatio = pdfPageSize.width / pdfPageSize.height;
    const widthFromHeight = availableHeight * aspectRatio;
    return Math.min(maxWidth, widthFromHeight);
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
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Spinner size="xl" className="mb-3" />
          <p className="text-sm">{t('preview.loading')}</p>
        </div>
      );
    }

    if (isImageFile(fileName) && mediaUrl) {
      return <img src={mediaUrl} alt={fileName} draggable={false} className="max-w-full max-h-[calc(100vh-10rem)] object-contain rounded pointer-events-none" />;
    }

    if (isVideoFile(fileName) && mediaUrl) {
      return <video src={mediaUrl} controls autoPlay playsInline controlsList="nodownload" className="max-w-full max-h-[calc(100vh-10rem)] rounded" onContextMenu={e => e.preventDefault()} />;
    }

    if (isAudioFile(fileName) && mediaUrl) {
      return <audio src={mediaUrl} controls className="w-full" />;
    }

    if (isPdfFile(fileName) && pdfSource) {
      GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
      return (
        <div className="flex flex-col items-center w-full">
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="py-16 text-muted-foreground text-sm">{t('preview.pdfLoading')}</div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={getPdfPageWidth()}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              onLoadSuccess={onPageLoadSuccess}
            />
          </Document>
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
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
      return null; // rendered via ref below
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
      <DialogContent className="w-auto min-w-[18rem] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)] overflow-hidden p-0 flex flex-col gap-0">
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
              className="docx-container w-full"
              style={{
                visibility: docxReady ? 'visible' : 'hidden',
                position: docxReady ? undefined : 'absolute',
                width: Math.min(600, window.innerWidth - 96),
              }}
            />
          )}
          {!(isDocxFile(fileName) && docxReady) && (
            <div className="m-auto max-w-full">
              {renderContent()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
