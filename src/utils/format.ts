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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
};

export const getExpirationLabel = (expiration: string): string => {
  const labels: Record<string, string> = {
    'one_hour': '1시간',
    'one_day': '1일',
    'three_days': '3일',
    'one_week': '1주일',
    'one_month': '1개월',
  };
  return labels[expiration] || '1일';
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
