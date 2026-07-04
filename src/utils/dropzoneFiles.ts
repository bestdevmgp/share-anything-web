import { setRelativePath } from './fileWithPath';
import { isJunkPath, isJunkFileName, isJunkDirectoryName } from './folderPath';

interface FSEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}
interface FSFileEntry extends FSEntry {
  isFile: true;
  file(success: (file: File) => void, error?: (err: unknown) => void): void;
}
interface FSDirectoryEntry extends FSEntry {
  isDirectory: true;
  createReader(): FSDirectoryReader;
}
interface FSDirectoryReader {
  readEntries(success: (entries: FSEntry[]) => void, error?: (err: unknown) => void): void;
}

const readFile = (entry: FSFileEntry): Promise<File> =>
  new Promise((resolve, reject) => entry.file(resolve, reject));

const readAllEntries = (reader: FSDirectoryReader): Promise<FSEntry[]> =>
  new Promise((resolve, reject) => {
    const all: FSEntry[] = [];
    const next = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
          return;
        }
        for (const e of batch) all.push(e);
        next();
      }, reject);
    };
    next();
  });

async function walkEntry(
  entry: FSEntry,
  prefix: string,
  out: { file: File; path: string }[],
  emptyDirs: string[]
): Promise<boolean> {
  if (entry.isFile) {
    if (isJunkFileName(entry.name)) return false;
    const fileEntry = entry as FSFileEntry;
    let file: File;
    try {
      file = await readFile(fileEntry);
    } catch {
      return true;
    }
    if (isJunkFileName(file.name)) return false;
    const path = prefix ? `${prefix}/${file.name}` : file.name;
    out.push({ file, path });
    return true;
  }

  if (entry.isDirectory) {
    if (isJunkDirectoryName(entry.name)) return false;
    const dirEntry = entry as FSDirectoryEntry;
    const reader = dirEntry.createReader();
    let entries: FSEntry[];
    try {
      entries = await readAllEntries(reader);
    } catch {
      return true;
    }
    const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    let anyFile = false;
    const emptyCountBefore = emptyDirs.length;
    for (const child of entries) {
      const contributed = await walkEntry(child, childPrefix, out, emptyDirs);
      anyFile = anyFile || contributed;
    }
    if (!anyFile && emptyDirs.length === emptyCountBefore) emptyDirs.push(childPrefix);
    return anyFile;
  }
  return false;
}

type DropLikeEvent = {
  dataTransfer?: DataTransfer | null;
  target?: { files?: FileList | null } | null;
};

const filterJunkFiles = (files: File[]): File[] =>
  files.filter((f) => {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
    return !isJunkPath(rel || f.name);
  });

let lastEmptyFolders: string[] = [];
export function consumeEmptyFolders(): string[] {
  const ef = lastEmptyFolders;
  lastEmptyFolders = [];
  return ef;
}

export async function getFilesWithPaths(event: unknown): Promise<File[]> {
  const e = event as DropLikeEvent;
  const dt = e?.dataTransfer ?? undefined;
  const items = dt?.items;

  if (dt && items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
    const entries: FSEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.() as FSEntry | null;
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      const collected: { file: File; path: string }[] = [];
      const emptyDirs: string[] = [];
      for (const entry of entries) {
        await walkEntry(entry, '', collected, emptyDirs);
      }
      lastEmptyFolders = emptyDirs;
      const files: File[] = [];
      for (const { file, path } of collected) {
        if (path.indexOf('/') !== -1) setRelativePath(file, path);
        files.push(file);
      }
      return files;
    }
  }

  lastEmptyFolders = [];
  const fileList = dt?.files ?? e?.target?.files ?? null;
  const files = fileList ? Array.from(fileList) : [];
  return filterJunkFiles(files);
}

type DirEntry = FSDirHandle | FSFileHandle;
interface FSDirHandle {
  kind: 'directory';
  name: string;
  values(): { next(): Promise<{ done?: boolean; value: DirEntry }> };
}
interface FSFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export function supportsDirectoryPicker(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
}

async function walkDirHandle(
  dir: FSDirHandle,
  prefix: string,
  out: { file: File; path: string }[],
  emptyDirs: string[]
): Promise<boolean> {
  const childPrefix = prefix ? `${prefix}/${dir.name}` : dir.name;
  let anyFile = false;
  const emptyCountBefore = emptyDirs.length;
  const it = dir.values();
  for (;;) {
    let next: { done?: boolean; value: DirEntry };
    try {
      next = await it.next();
    } catch {
      anyFile = true;
      break;
    }
    if (next.done) break;
    const handle = next.value;
    if (handle.kind === 'file') {
      if (isJunkFileName(handle.name)) continue;
      let file: File;
      try {
        file = await handle.getFile();
      } catch {
        anyFile = true;
        continue;
      }
      if (isJunkFileName(file.name)) continue;
      const path = `${childPrefix}/${file.name}`;
      out.push({ file, path });
      anyFile = true;
    } else {
      if (isJunkDirectoryName(handle.name)) continue;
      const contributed = await walkDirHandle(handle, childPrefix, out, emptyDirs);
      anyFile = anyFile || contributed;
    }
  }
  if (!anyFile && emptyDirs.length === emptyCountBefore) emptyDirs.push(childPrefix);
  return anyFile;
}

export async function pickDirectoryWithEmpties(): Promise<{ files: File[]; emptyFolders: string[] } | null> {
  const w = window as unknown as { showDirectoryPicker?: () => Promise<FSDirHandle> };
  if (typeof w.showDirectoryPicker !== 'function') return null;
  let dirHandle: FSDirHandle;
  try {
    dirHandle = await w.showDirectoryPicker();
  } catch {
    return null;
  }
  const collected: { file: File; path: string }[] = [];
  const emptyDirs: string[] = [];
  await walkDirHandle(dirHandle, '', collected, emptyDirs);
  const files: File[] = [];
  for (const { file, path } of collected) {
    if (path.indexOf('/') !== -1) setRelativePath(file, path);
    files.push(file);
  }
  return { files, emptyFolders: emptyDirs };
}
