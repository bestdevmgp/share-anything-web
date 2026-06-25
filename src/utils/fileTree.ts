import { sanitizeRelativePath } from './folderPath';

export interface TreeFile {
  kind: 'file';
  id: string;
  name: string;
  size: number;
  previewUrl?: string;
}

export interface TreeFolder {
  kind: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

interface FileLike {
  id: string;
  file_name: string;
  file_size: number;
  relative_path?: string;
  preview_url?: string;
}

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'folder' ? -1 : 1));
  for (const n of nodes) if (n.kind === 'folder') sortNodes(n.children);
}

function ensureFolder(root: TreeFolder, segments: string[]): TreeFolder {
  let cursor = root;
  let acc = '';
  for (const seg of segments) {
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
  return cursor;
}

export function toggleFolderOpen(open: Set<string>, path: string): Set<string> {
  const next = new Set(open);
  if (next.has(path)) {
    for (const p of Array.from(next)) {
      if (p === path || p.startsWith(path + '/')) next.delete(p);
    }
  } else {
    next.add(path);
  }
  return next;
}

export function buildFileTree(files: FileLike[], emptyFolders: string[] = []): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] };
  for (const f of files) {
    const rel = sanitizeRelativePath(f.relative_path || '');
    const segs = rel ? rel.split('/') : [];
    const folder = ensureFolder(root, segs.slice(0, -1));
    folder.children.push({ kind: 'file', id: f.id, name: f.file_name, size: f.file_size, previewUrl: f.preview_url });
  }
  for (const ef of emptyFolders) {
    const segs = sanitizeRelativePath(ef).split('/').filter(Boolean);
    if (segs.length > 0) ensureFolder(root, segs);
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
