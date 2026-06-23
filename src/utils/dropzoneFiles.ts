import { setRelativePath } from './fileWithPath';
import { isJunkPath } from './folderPath';

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

// Returns whether this entry contributed at least one file. Directories whose
// entire subtree has no files are recorded in `emptyDirs` (their full path), so
// the structure can still show the empty folder. Drag-and-drop only — the
// folder-picker input never exposes empty directories.
async function walkEntry(
  entry: FSEntry,
  prefix: string,
  out: { file: File; path: string }[],
  emptyDirs: string[]
): Promise<boolean> {
  if (isJunkPath(entry.name)) return false;

  if (entry.isFile) {
    const fileEntry = entry as FSFileEntry;
    let file: File;
    try {
      file = await readFile(fileEntry);
    } catch {
      return false;
    }
    const path = prefix ? `${prefix}/${file.name}` : file.name;
    if (isJunkPath(path)) return false;
    out.push({ file, path });
    return true;
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FSDirectoryEntry;
    const reader = dirEntry.createReader();
    let entries: FSEntry[];
    try {
      entries = await readAllEntries(reader);
    } catch {
      return false;
    }
    const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    let anyFile = false;
    for (const child of entries) {
      const contributed = await walkEntry(child, childPrefix, out, emptyDirs);
      anyFile = anyFile || contributed;
    }
    if (!anyFile) emptyDirs.push(childPrefix);
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

// Empty-folder paths captured during the most recent drag-and-drop. react-dropzone's
// getFilesFromEvent must return File[], so empty folders ride this side-channel —
// read it synchronously right after the drop (in onDrop / the folder handler).
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

  // Folder-picker input / plain file list: the browser does not expose empty
  // directories here, so there are none to capture.
  lastEmptyFolders = [];
  const fileList = dt?.files ?? e?.target?.files ?? null;
  const files = fileList ? Array.from(fileList) : [];
  return filterJunkFiles(files);
}
