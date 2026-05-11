import { translate } from '../i18n';
import { Language } from '../context/LanguageContext';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDate = (dateString: string, language: Language = 'ko'): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return translate(language, 'format.expired');
  } else if (days === 0) {
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return translate(language, 'format.expiresInHours', { hours });
  } else if (days === 1) {
    return translate(language, 'format.expiresTomorrow');
  } else {
    return translate(language, 'format.expiresInDays', { days });
  }
};

export const formatDateTime = (dateString: string, language: Language = 'ko'): string => {
  const date = new Date(dateString);

  if (language === 'en') {
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return translate(language, 'format.dateTime', { year, month, day, hours, minutes, seconds });
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return translate(language, 'format.dateTime', { year, month, day, hours, minutes, seconds });
};

export const formatDateOnly = (dateString: string, language: Language = 'ko'): string => {
  const date = new Date(dateString);

  if (language === 'en') {
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    return translate(language, 'format.dateOnly', { year, month, day });
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return translate(language, 'format.dateOnly', { year, month, day });
};

export const getExpirationLabel = (expiration: string, language: Language = 'ko'): string => {
  const labels: Record<string, string> = {
    'five_minutes': translate(language, 'format.5min'),
    'thirty_minutes': translate(language, 'format.30min'),
    'one_hour': translate(language, 'format.1hour'),
    'three_hours': translate(language, 'format.3hours'),
    'six_hours': translate(language, 'format.6hours'),
    'twelve_hours': translate(language, 'format.12hours'),
    'twenty_four_hours': translate(language, 'format.24hours'),
  };
  return labels[expiration] || translate(language, 'format.24hours');
};

export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(extension);
};

export const isPdfFile = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return extension === '.pdf';
};

export const isVideoFile = (filename: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(extension);
};

export const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return audioExtensions.includes(extension);
};

export const isTextFile = (filename: string): boolean => {
  const textExtensions = ['.txt', '.json', '.xml', '.md', '.log', '.yaml', '.yml', '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.sh'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return textExtensions.includes(extension);
};

export const isCsvFile = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return extension === '.csv';
};

export const isExcelFile = (filename: string): boolean => {
  const excelExtensions = ['.xlsx', '.xls'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return excelExtensions.includes(extension);
};

export const isDocxFile = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return extension === '.docx';
};

export const isPptxFile = (filename: string): boolean => {
  const pptxExtensions = ['.pptx', '.ppt'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return pptxExtensions.includes(extension);
};

export const isHwpFile = (filename: string): boolean => {
  const hwpExtensions = ['.hwp', '.hwpx'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return hwpExtensions.includes(extension);
};

export const formatTimeRemaining = (remainingSeconds: number, language: Language = 'ko'): string => {
  if (remainingSeconds < 0 || !isFinite(remainingSeconds)) {
    return translate(language, 'format.calculating');
  }

  if (remainingSeconds < 60) {
    return translate(language, 'format.secondsRemaining', { seconds: Math.max(1, Math.ceil(remainingSeconds)) });
  } else if (remainingSeconds < 3600) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.ceil(remainingSeconds % 60);
    return translate(language, 'format.minutesSecondsRemaining', { minutes, seconds });
  } else {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = Math.ceil(remainingSeconds % 60);
    return translate(language, 'format.hoursMinutesSecondsRemaining', { hours, minutes, seconds });
  }
};

export const calculateTimeRemaining = (
  startTime: number,
  loadedBytes: number,
  totalBytes: number
): number => {
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs < 2000 || loadedBytes <= 0 || loadedBytes < totalBytes * 0.02) {
    return Infinity;
  }

  const bytesPerMs = loadedBytes / elapsedMs;
  const remainingBytes = totalBytes - loadedBytes;
  const remainingMs = remainingBytes / bytesPerMs;

  return remainingMs / 1000;
};

export const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;

  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';

  if (/Android/.test(ua)) {
    const match = ua.match(/\(Linux; Android [^;]+; ([^)]+?)(?:\s*Build\/|\))/i);
    if (match?.[1]) {
      const model = match[1].trim();
      if (model && model !== 'K') return model;
    }
    return /Mobile/.test(ua) ? 'Android' : 'Android Tablet';
  }

  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  if (/CrOS/.test(ua)) return 'Chromebook';

  return 'Unknown';
};
