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
    let blobUrl: string | null = null;
    const isPartial = typeof source === 'string' && !source.startsWith('blob:');

    const cleanup = () => {
      clearTimeout(overallTimeout);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };

    const overallTimeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out'));
    }, 10000);

    const doCapture = (video: HTMLVideoElement) => {
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup();
          reject(new Error('Video has no dimensions'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cleanup();
        resolve(dataUrl);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    const loadAndCapture = (videoSrc: string) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      if (isPartial) {
        // Partial data (Range fetch): capture first available frame immediately
        video.onloadeddata = () => doCapture(video);
      } else {
        // Full data (File/blob): seek to early position for a better frame
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration / 2);
        };
        video.onseeked = () => doCapture(video);
      }

      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video'));
      };

      video.src = videoSrc;
    };

    if (source instanceof File) {
      blobUrl = URL.createObjectURL(source);
      loadAndCapture(blobUrl);
    } else if (source.startsWith('blob:')) {
      loadAndCapture(source);
    } else {
      // Remote URL: fetch first 5MB as blob to avoid CORS canvas taint
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 5000);

      fetch(source, {
        signal: controller.signal,
        headers: { Range: 'bytes=0-5242879' },
      })
        .then(res => res.blob())
        .then(blob => {
          clearTimeout(fetchTimer);
          blobUrl = URL.createObjectURL(blob);
          loadAndCapture(blobUrl);
        })
        .catch(() => {
          clearTimeout(fetchTimer);
          cleanup();
          reject(new Error('Failed to fetch video for thumbnail'));
        });
    }
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
