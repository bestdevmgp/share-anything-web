import React, { useEffect, useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { XMarkIcon, DocumentIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatFileSize, isImageFile, isVideoFile, isAudioFile, isTextFile, isPdfFile, isCsvFile, isExcelFile, isDocxFile, isHwpFile } from '../utils/format';
import { readTextContent, getMediaUrl, getArrayBuffer } from '../utils/filePreview';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { PDF_WORKER_SRC } from '../utils/pdfWorkerSetup';

interface FilePreviewModalProps {
  file: {
    fileName: string;
    fileSize: number;
    source: File | string;
  };
  onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const { fileName, fileSize, source } = file;
  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [excelData, setExcelData] = useState<string[][] | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfSource, setPdfSource] = useState<File | { url: string } | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
          objectUrl = getMediaUrl(source);
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
        } else if (isDocxFile(fileName)) {
          const mammoth = await import('mammoth');
          const data = await getArrayBuffer(source);
          const result = await mammoth.convertToHtml({ arrayBuffer: data });
          if (!cancelled) setDocxHtml(result.value);
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
      if (objectUrl && source instanceof File) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source, fileName]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const renderTable = (data: string[][]) => (
    <div className="w-full overflow-auto max-h-[70vh]">
      <table className="min-w-full text-sm border-collapse">
        <thead className="sticky top-0">
          <tr>
            {(data[0] || []).map((cell, i) => (
              <th key={i} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-left font-medium text-gray-700 dark:text-[#EDEDED] whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(1).map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-white/5">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-200 dark:border-white/10 px-3 py-1.5 text-gray-800 dark:text-[#EDEDED] whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center py-16 text-gray-400 dark:text-[#666666]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm">로딩 중...</p>
        </div>
      );
    }

    if (isImageFile(fileName) && mediaUrl) {
      return <img src={mediaUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain rounded" />;
    }

    if (isVideoFile(fileName) && mediaUrl) {
      return <video src={mediaUrl} controls className="max-w-full max-h-[70vh] rounded" />;
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
              <div className="py-16 text-gray-400 dark:text-[#666666] text-sm">PDF 로딩 중...</div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={Math.min(600, window.innerWidth - 80)}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-[#888888]" />
              </button>
              <span className="text-sm text-gray-600 dark:text-[#888888]">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-[#888888]" />
              </button>
            </div>
          )}
        </div>
      );
    }

    if (isCsvFile(fileName) && csvData) {
      return renderTable(csvData);
    }

    if (isExcelFile(fileName) && excelData) {
      return renderTable(excelData);
    }

    if (isDocxFile(fileName) && docxHtml) {
      return (
        <div
          className="w-full max-h-[70vh] overflow-auto prose prose-sm max-w-none px-4"
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      );
    }

    if (isTextFile(fileName) && textContent !== null) {
      return (
        <div className="w-full max-h-[70vh] overflow-auto bg-gray-50 dark:bg-white/5 rounded-xl p-6">
          <pre className="text-sm text-gray-800 dark:text-[#EDEDED] whitespace-pre-wrap break-words font-mono">
            {textContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center py-12 text-gray-400 dark:text-[#666666]">
        <DocumentIcon className="w-16 h-16 mb-3" />
        <p className="text-sm">미리보기를 지원하지 않는 파일입니다.</p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/70 dark:backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-[#0B0A0B] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-[#EDEDED] truncate">{fileName}</p>
            <p className="text-xs text-gray-500 dark:text-[#888888]">{formatFileSize(fileSize)}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-[#888888]" />
          </button>
        </div>
        <div className="p-4 flex overflow-auto max-h-[calc(85vh-4rem)]">
          <div className="m-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
