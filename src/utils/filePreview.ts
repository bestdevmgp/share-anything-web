export async function getArrayBuffer(source: File | string): Promise<ArrayBuffer> {
  if (source instanceof File) {
    return source.arrayBuffer();
  }
  const res = await fetch(source);
  return res.arrayBuffer();
}

export function getMediaUrl(source: File | string): string {
  if (source instanceof File) {
    return URL.createObjectURL(source);
  }
  return source;
}

export async function generatePdfThumbnail(source: File | string, width = 200): Promise<string> {
  const { pdfjs } = await import('react-pdf');
  const { PDF_WORKER_SRC } = await import('./pdfWorkerSetup');
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const data = await getArrayBuffer(source);
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const scale = width / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/png');
  pdf.destroy();
  return dataUrl;
}

export function generateVideoThumbnail(source: File | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = source instanceof File ? URL.createObjectURL(source) : source;
    const isObjectUrl = source instanceof File;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      if (isObjectUrl) URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    video.onerror = () => {
      if (isObjectUrl) URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

export async function generatePptxThumbnail(source: File | string): Promise<string | null> {
  const JSZip = (await import('jszip')).default;
  const data = await getArrayBuffer(source);
  const zip = await JSZip.loadAsync(data);
  for (const path of ['docProps/thumbnail.jpeg', 'docProps/thumbnail.png']) {
    const entry = zip.file(path);
    if (entry) {
      const blob = await entry.async('blob');
      return URL.createObjectURL(blob);
    }
  }
  return null;
}

export async function readTextContent(source: File | string, maxLength = 5000): Promise<string> {
  if (source instanceof File) {
    const text = await source.text();
    return text.slice(0, maxLength);
  }
  const res = await fetch(source);
  const text = await res.text();
  return text.slice(0, maxLength);
}
