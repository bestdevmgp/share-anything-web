import React, { useCallback, useEffect, useRef, useState } from 'react';
import { userAPI } from '../services/api';
import { DownloadLog } from '../types';
import { toast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import { formatDateTime } from '../utils/format';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { Separator } from './ui/separator';

interface DownloadLogsModalProps {
  fileId: string;
  onClose: () => void;
}

const DownloadLogsModal: React.FC<DownloadLogsModalProps> = ({ fileId, onClose }) => {
  const { t, language } = useTranslation();
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDownloadLogs();
  }, [fileId]);

  useEffect(() => {
    if (!loading && logs.length > 0) {
      const timer = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container && container.scrollWidth > container.clientWidth) {
          setShowScrollHint(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, logs]);

  const dismissScrollHint = useCallback(() => {
    setShowScrollHint(false);
  }, []);

  const fetchDownloadLogs = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getDownloadLogs(fileId);
      setLogs(data);
    } catch (error: any) {
      console.error('Failed to fetch download logs:', error);
      toast.error(t('downloadLogs.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => formatDateTime(dateString, language);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-5 pb-4 sm:p-6">
          <DialogTitle>{t('downloadLogs.title')}</DialogTitle>
        </DialogHeader>
        <Separator />

        <div className="flex-1 min-h-0 overflow-auto relative">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('downloadLogs.noLogs')}</p>
            </div>
          ) : (
            <div className="relative">
              <div ref={scrollContainerRef} className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider h-auto">
                        {t('downloadLogs.downloader')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider h-auto">
                        {t('downloadLogs.ipAddress')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider h-auto">
                        {t('downloadLogs.platform')}
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider h-auto">
                        {t('downloadLogs.downloadDate')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-card">
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {log.downloader_name || t('common.anonymous')}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.ip_address}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {log.device_platform}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(log.downloaded_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {showScrollHint && (
                <div
                  className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center cursor-pointer"
                  onClick={dismissScrollHint}
                  onTouchStart={dismissScrollHint}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-12 h-12 text-white animate-scroll-hint-hand"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <span className="text-white text-sm font-medium">{t('common.scrollHorizontally')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-muted px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </DialogContent>

      <style>{`
        @keyframes scroll-hint-hand {
          0%, 100% { transform: translateX(-12px); opacity: 0.7; }
          50% { transform: translateX(12px); opacity: 1; }
        }
        .animate-scroll-hint-hand {
          animation: scroll-hint-hand 1.5s ease-in-out infinite;
        }
      `}</style>
    </Dialog>
  );
};

export default DownloadLogsModal;
