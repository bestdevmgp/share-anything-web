import { makeZip } from 'client-zip';
import { downloadFile } from './format';
import { sanitizeRelativePath } from './folderPath';

interface FileSystemWritableFileStreamLike {
  write(data: BufferSource | Blob | string): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}
interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}
interface SaveFilePickerWindow {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandleLike>;
}

export function canStreamToDisk(): boolean {
  return typeof (window as unknown as SaveFilePickerWindow).showSaveFilePicker === 'function';
}

export interface ZipFileSpec {
  id: string;
  entryName: string;
  fileName: string;
  size: number;
}

export interface ZipProgress {
  done: number;
  total: number;
  current?: string;
}

export class ZipFetchError extends Error {
  constructor(public readonly entryName: string, cause?: unknown) {
    super(`Failed to fetch "${entryName}" while building the ZIP`);
    this.name = 'ZipFetchError';
    (this as { cause?: unknown }).cause = cause;
  }
}

type GetUrl = (id: string) => Promise<string>;

function normalizeFolderPaths(paths: string[] | undefined): string[] {
  if (!paths || paths.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of paths) {
    const p = sanitizeRelativePath(raw);
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

function sanitizeEntryName(entryName: string, fallback?: string): string {
  return sanitizeRelativePath(entryName) || sanitizeRelativePath(fallback) || 'file';
}

function sanitizeSpecEntryNames(specs: ZipFileSpec[]): ZipFileSpec[] {
  return specs.map((spec) => {
    const entryName = sanitizeEntryName(spec.entryName, spec.fileName);
    return entryName === spec.entryName ? spec : { ...spec, entryName };
  });
}

function dedupeEntryNames(specs: ZipFileSpec[]): ZipFileSpec[] {
  const seen = new Map<string, number>();
  return specs.map((spec) => {
    const key = spec.entryName.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return spec;

    const slash = spec.entryName.lastIndexOf('/');
    const dir = slash === -1 ? '' : spec.entryName.slice(0, slash + 1);
    const leaf = slash === -1 ? spec.entryName : spec.entryName.slice(slash + 1);
    const dot = leaf.lastIndexOf('.');
    const base = dot <= 0 ? leaf : leaf.slice(0, dot);
    const ext = dot <= 0 ? '' : leaf.slice(dot);
    return { ...spec, entryName: `${dir}${base} (${count + 1})${ext}` };
  });
}

export async function createStructuredZip(opts: {
  specs: ZipFileSpec[];
  getDownloadUrl: GetUrl;
  suggestedName: string;
  onProgress?: (p: ZipProgress) => void;
  signal?: AbortSignal;
  preferFallback?: boolean;
  emptyFolders?: string[];
}): Promise<boolean> {
  const specs = dedupeEntryNames(sanitizeSpecEntryNames(opts.specs));
  const emptyFolders = normalizeFolderPaths(opts.emptyFolders);
  const total = specs.length;

  const useStreaming = canStreamToDisk() && !opts.preferFallback;

  if (useStreaming) {
    return streamToDisk(specs, opts.getDownloadUrl, opts.suggestedName, total, emptyFolders, opts.onProgress, opts.signal);
  }
  await buildInMemory(specs, opts.getDownloadUrl, opts.suggestedName, total, emptyFolders, opts.onProgress, opts.signal);
  return true;
}

async function streamToDisk(
  specs: ZipFileSpec[],
  getDownloadUrl: GetUrl,
  suggestedName: string,
  total: number,
  emptyFolders: string[],
  onProgress?: (p: ZipProgress) => void,
  signal?: AbortSignal
): Promise<boolean> {
  const win = window as unknown as SaveFilePickerWindow;
  let handle: FileSystemFileHandleLike;
  try {
    handle = await win.showSaveFilePicker!({
      suggestedName,
      types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === 'AbortError') return false;
    throw err;
  }

  const writable = await handle.createWritable();

  async function* entries() {
    for (const folder of emptyFolders) {
      yield { name: folder };
    }
    for (let i = 0; i < specs.length; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const spec = specs[i];
      onProgress?.({ done: i, total, current: spec.entryName });
      let res: Response;
      try {
        const url = await getDownloadUrl(spec.id);
        res = await fetch(url, { signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        if (signal?.aborted) throw err;
        throw new ZipFetchError(spec.entryName, err);
      }
      yield {
        name: spec.entryName,
        input: res.body as ReadableStream<Uint8Array>,
        size: spec.size,
        lastModified: new Date(),
      };
      onProgress?.({ done: i + 1, total, current: spec.entryName });
    }
  }

  const zipStream = makeZip(entries());

  try {
    const reader = zipStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
    }
    await writable.close();
    return true;
  } catch (err) {
    try {
      await writable.abort?.();
    } catch {
    }
    throw err;
  }
}

/**
 * Stream a ZIP straight to disk (File System Access), pulling each file from the
 * caller's async iterable ONE AT A TIME. `makeZip` fully writes a file's bytes to
 * disk before requesting the next entry, so the caller (a P2P receiver) only fetches
 * the next file once the previous one is flushed — peak memory stays at ~one file.
 * That is what lets a receiver save a hundreds-of-GB folder without holding it in RAM.
 *
 * Returns false if the user dismisses the save dialog (treat as a silent cancel).
 * `onFileWritten` fires after each file's bytes have been written to disk.
 */
export async function streamBlobsToDiskZip(opts: {
  files: AsyncIterable<{ name: string; blob: Blob }>;
  suggestedName: string;
  emptyFolders?: string[];
  onFileWritten?: (name: string) => void;
  signal?: AbortSignal;
}): Promise<boolean> {
  const win = window as unknown as SaveFilePickerWindow;
  let handle: FileSystemFileHandleLike;
  try {
    handle = await win.showSaveFilePicker!({
      suggestedName: opts.suggestedName,
      types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === 'AbortError') return false;
    throw err;
  }

  const writable = await handle.createWritable();
  const emptyFolders = normalizeFolderPaths(opts.emptyFolders);

  // De-duplicate entry names on the fly (streaming sees them one at a time).
  const seen = new Map<string, number>();
  const uniqueName = (name: string): string => {
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;
    const slash = name.lastIndexOf('/');
    const dir = slash === -1 ? '' : name.slice(0, slash + 1);
    const leaf = slash === -1 ? name : name.slice(slash + 1);
    const dot = leaf.lastIndexOf('.');
    const base = dot <= 0 ? leaf : leaf.slice(0, dot);
    const ext = dot <= 0 ? '' : leaf.slice(dot);
    return `${dir}${base} (${count + 1})${ext}`;
  };

  async function* entries() {
    for (const folder of emptyFolders) yield { name: folder };
    for await (const { name, blob } of opts.files) {
      if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      yield {
        name: uniqueName(sanitizeEntryName(name)),
        input: blob.stream() as ReadableStream<Uint8Array>,
        size: blob.size,
        lastModified: new Date(),
      };
      // Reached only after makeZip pulls the next entry, i.e. this file is fully written.
      opts.onFileWritten?.(name);
    }
  }

  const zipStream = makeZip(entries());
  try {
    const reader = zipStream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
    }
    await writable.close();
    return true;
  } catch (err) {
    try {
      await writable.abort?.();
    } catch {
    }
    throw err;
  }
}

export async function createZipFromBlobs(
  files: { entryName: string; blob: Blob }[],
  suggestedName: string,
  emptyFolders?: string[]
): Promise<void> {
  const specs = dedupeEntryNames(
    files.map((f, i) => ({ id: String(i), entryName: sanitizeEntryName(f.entryName), fileName: f.entryName, size: f.blob.size }))
  );
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const folder of normalizeFolderPaths(emptyFolders)) {
    zip.folder(folder);
  }
  specs.forEach((spec, i) => zip.file(spec.entryName, files[i].blob));
  const out = await zip.generateAsync({ type: 'blob' });
  downloadFile(out, suggestedName);
}

async function buildInMemory(
  specs: ZipFileSpec[],
  getDownloadUrl: GetUrl,
  suggestedName: string,
  total: number,
  emptyFolders: string[],
  onProgress?: (p: ZipProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const folder of emptyFolders) {
    zip.folder(folder);
  }

  for (let i = 0; i < specs.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const spec = specs[i];
    onProgress?.({ done: i, total, current: spec.entryName });
    let blob: Blob;
    try {
      const url = await getDownloadUrl(spec.id);
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new ZipFetchError(spec.entryName, err);
    }
    zip.file(spec.entryName, blob);
    onProgress?.({ done: i + 1, total, current: spec.entryName });
  }

  const out = await zip.generateAsync({ type: 'blob' });
  downloadFile(out, suggestedName);
}
