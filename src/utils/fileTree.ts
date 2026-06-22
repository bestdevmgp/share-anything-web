import { sanitizeRelativePath } from './folderPath';

// A download share's files, grouped into a folder tree from their relative_path.
// A file's relative_path is its full path INCLUDING the leaf name (e.g.
// "docs/2024/report.pdf"); the leading segments are folders, the last is the
// file. Files with no folder segment are root ("loose") files.

export interface TreeFile {
  kind: 'file';
  id: string;
  name: string;
  size: number;
}

export interface TreeFolder {
  kind: 'folder';
  name: string;
  path: string; // full path from the root, e.g. "docs/2024"
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

interface FileLike {
  id: string;
  file_name: string;
  file_size: number;
  relative_path?: string;
}

// Folders before files at every level; insertion order preserved within a kind.
function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'folder' ? -1 : 1));
  for (const n of nodes) if (n.kind === 'folder') sortNodes(n.children);
}

export function buildFileTree(files: FileLike[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const f of files) {
    const rel = sanitizeRelativePath(f.relative_path || '');
    const segs = rel ? rel.split('/') : [];
    const folderSegs = segs.slice(0, -1); // last segment is the file name
    let cursor = root;
    let acc = '';
    for (const seg of folderSegs) {
      const path = acc ? `${acc}/${seg}` : seg;
      acc = path;
      let next = cursor.children.find(
        (c): c is TreeFolder => c.kind === 'folder' && c.path === path
      );
      if (!next) {
        next = { kind: 'folder', name: seg, path, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push({ kind: 'file', id: f.id, name: f.file_name, size: f.file_size });
  }
  sortNodes(root.children);
  return root.children;
}

export function collectFileIds(node: TreeNode): string[] {
  return node.kind === 'file' ? [node.id] : node.children.flatMap(collectFileIds);
}

export function nodeSize(node: TreeNode): number {
  return node.kind === 'file' ? node.size : node.children.reduce((s, c) => s + nodeSize(c), 0);
}

export function nodeFileCount(node: TreeNode): number {
  return node.kind === 'file' ? 1 : node.children.reduce((s, c) => s + nodeFileCount(c), 0);
}

// Number of rows that would actually render given which folders are open — a
// folder row is always counted; its descendants only while it is open.
export function countVisibleRows(nodes: TreeNode[], isOpen: (path: string) => boolean): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.kind === 'folder' && isOpen(node.path)) {
      n += countVisibleRows(node.children, isOpen);
    }
  }
  return n;
}

// Paths of every folder on the way down to a file id (so they can be expanded).
export function ancestorPaths(nodes: TreeNode[], fileId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.kind === 'file') {
      if (node.id === fileId) return trail;
    } else {
      const found = ancestorPaths(node.children, fileId, [...trail, node.path]);
      if (found) return found;
    }
  }
  return null;
}

export function hasFolders(nodes: TreeNode[]): boolean {
  return nodes.some((n) => n.kind === 'folder');
}
