export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return '만료됨';
  } else if (days === 0) {
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    return `${hours}시간 후 만료`;
  } else if (days === 1) {
    return '내일 만료';
  } else {
    return `${days}일 후 만료`;
  }
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
};

export const getExpirationLabel = (expiration: string): string => {
  const labels: Record<string, string> = {
    'five_minutes': '5분',
    'thirty_minutes': '30분',
    'one_hour': '1시간',
    'three_hours': '3시간',
    'six_hours': '6시간',
    'twelve_hours': '12시간',
    'twenty_four_hours': '24시간',
  };
  return labels[expiration] || '24시간';
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

export const isHwpFile = (filename: string): boolean => {
  const hwpExtensions = ['.hwp', '.hwpx'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return hwpExtensions.includes(extension);
};

export const formatTimeRemaining = (remainingSeconds: number): string => {
  if (remainingSeconds <= 0 || !isFinite(remainingSeconds)) {
    return '계산 중...';
  }

  if (remainingSeconds < 60) {
    return `${Math.ceil(remainingSeconds)}초 남음`;
  } else if (remainingSeconds < 3600) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.ceil(remainingSeconds % 60);
    return `${minutes}분 ${seconds}초 남음`;
  } else {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = Math.ceil(remainingSeconds % 60);
    return `${hours}시간 ${minutes}분 ${seconds}초 남음`;
  }
};

export const calculateTimeRemaining = (
  startTime: number,
  loadedBytes: number,
  totalBytes: number
): number => {
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs < 500 || loadedBytes === 0) {
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
