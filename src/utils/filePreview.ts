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

      // iOS Safari requires video element in DOM for reliable data loading
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

const docxHtmlCache = new Map<string, string>();

function getDocxCacheKey(source: File | string): string {
  if (source instanceof File) {
    return `docx:${source.name}:${source.size}:${source.lastModified}`;
  }
  return `docx:${source}`;
}

export async function generateDocxThumbnail(source: File | string, width = 200): Promise<string> {
  const cacheKey = getDocxCacheKey(source);
  const cachedHtml = docxHtmlCache.get(cacheKey);

  let sectionHtml: string;
  let sectionWidth: number;

  if (cachedHtml) {
    // Parse cached dimensions from the stored string
    const match = cachedHtml.match(/^(\d+):/);
    sectionWidth = match ? parseInt(match[1]) : 600;
    sectionHtml = cachedHtml.slice(match ? match[0].length : 0);
  } else {
    const { renderAsync } = await import('docx-preview');
    const data = await getArrayBuffer(source);

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:600px;background:white;';
    document.body.appendChild(container);

    await renderAsync(data, container, undefined, {
      inWrapper: false,
      ignoreFonts: true,
      breakPages: false,
      useBase64URL: true,
      ignoreWidth: false,
      ignoreHeight: false,
    });

    const section = container.querySelector('section.docx') as HTMLElement | null;
    if (!section) {
      document.body.removeChild(container);
      throw new Error('DOCX render failed');
    }

    sectionWidth = section.offsetWidth;
    sectionHtml = section.outerHTML;
    docxHtmlCache.set(cacheKey, `${sectionWidth}:${sectionHtml}`);

    document.body.removeChild(container);
  }

  // Render cached HTML into a measurement container
  const renderContainer = document.createElement('div');
  renderContainer.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${sectionWidth}px;background:white;`;
  renderContainer.innerHTML = sectionHtml;
  document.body.appendChild(renderContainer);

  const section = renderContainer.firstElementChild as HTMLElement;
  const contentHeight = section.scrollHeight;

  // Create canvas for thumbnail
  const scale = width / sectionWidth;
  const thumbHeight = width; // square
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = thumbHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, thumbHeight);

  // Use SVG foreignObject to render HTML onto canvas
  // Serialize with xmlns
  const serializer = new XMLSerializer();
  const xhtml = serializer.serializeToString(section);

  const cropTop = Math.min(40, contentHeight * 0.05);
  const viewHeight = thumbHeight / scale;

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${sectionWidth}" height="${viewHeight}">
    <foreignObject width="${sectionWidth}" height="${contentHeight}" y="${-cropTop}">
      ${xhtml}
    </foreignObject>
  </svg>`;

  document.body.removeChild(renderContainer);

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, thumbHeight);
      URL.revokeObjectURL(svgUrl);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to render DOCX thumbnail'));
    };
    img.src = svgUrl;
  });
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
