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
  try {
    const page = await pdf.getPage(1);
    const scale = width / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    return canvas.toDataURL('image/png');
  } finally {
    pdf.destroy();
  }
}

export function generateVideoThumbnail(source: File | string): Promise<string> {
  return new Promise((resolve, reject) => {
    let blobUrl: string | null = null;

    const cleanup = (video?: HTMLVideoElement) => {
      clearTimeout(overallTimeout);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (video?.parentNode) video.parentNode.removeChild(video);
    };

    const overallTimeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timed out'));
    }, 10000);

    const doCapture = (video: HTMLVideoElement) => {
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup(video);
          reject(new Error('Video has no dimensions'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cleanup(video);
        resolve(dataUrl);
      } catch (e) {
        cleanup(video);
        reject(e);
      }
    };

    const loadAndCapture = (videoSrc: string) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0';
      document.body.appendChild(video);

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };

      video.onseeked = () => doCapture(video);

      video.onerror = () => {
        cleanup(video);
        reject(new Error('Failed to load video'));
      };

      video.src = videoSrc;
      video.load();
    };

    if (source instanceof File) {
      blobUrl = URL.createObjectURL(source);
      loadAndCapture(blobUrl);
    } else if (typeof source === 'string' && source.startsWith('blob:')) {
      loadAndCapture(source);
    } else {
      const fetchBlob = async (): Promise<Blob> => {
        const ctrl1 = new AbortController();
        const timer1 = setTimeout(() => ctrl1.abort(), 5000);
        try {
          const res = await fetch(source as string, {
            signal: ctrl1.signal,
            headers: { Range: 'bytes=0-5242879' },
          });
          clearTimeout(timer1);
          return await res.blob();
        } catch {
          clearTimeout(timer1);
        }
        const ctrl2 = new AbortController();
        const timer2 = setTimeout(() => ctrl2.abort(), 6000);
        try {
          const res = await fetch(source as string, { signal: ctrl2.signal });
          clearTimeout(timer2);
          return await res.blob();
        } catch {
          clearTimeout(timer2);
          throw new Error('Failed to fetch video');
        }
      };

      fetchBlob()
        .then(blob => {
          blobUrl = URL.createObjectURL(blob);
          loadAndCapture(blobUrl);
        })
        .catch(() => {
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

export async function generateHwpThumbnail(source: File | string): Promise<string | null> {
  const data = await getArrayBuffer(source);
  const fileName = source instanceof File ? source.name : source;
  const isHwpx = fileName.toLowerCase().endsWith('.hwpx');

  let buf: Uint8Array | null = null;

  if (isHwpx) {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(data);
    for (const path of ['Preview/PrvImage.png', 'preview/PrvImage.png', 'Preview/prvimage.png']) {
      const entry = zip.file(path);
      if (entry) {
        buf = await entry.async('uint8array');
        break;
      }
    }
  } else {
    const CFB = await import('cfb');
    const container = CFB.read(new Uint8Array(data), { type: 'array' });
    const prvImage = CFB.find(container, '/PrvImage');
    if (prvImage) {
      buf = prvImage.content instanceof Uint8Array
        ? prvImage.content
        : new Uint8Array(prvImage.content);
    }
  }

  if (!buf || buf.length === 0) return null;

  let mime = 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) mime = 'image/gif';
  else if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
  else if (buf[0] === 0x42 && buf[1] === 0x4D) mime = 'image/bmp';

  const blob = new Blob([buf], { type: mime });
  return URL.createObjectURL(blob);
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
