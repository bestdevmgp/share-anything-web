import { translate } from '../i18n';
import { Language } from '../context/LanguageContext';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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

export const formatCompactDateTime = (dateString: string, language: Language = 'ko'): string => {
  return new Intl.DateTimeFormat(language, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateString));
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
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
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

export const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const type = file.type.toLowerCase();
    if (!type.startsWith('image/') || type === 'image/svg+xml') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
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
