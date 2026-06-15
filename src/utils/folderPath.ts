export const MAX_RELATIVE_PATH_LENGTH = 1024;

const JUNK_NAMES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
]);

const JUNK_SEGMENTS = new Set([
  '__macosx',
]);

export function sanitizeRelativePath(raw: string | null | undefined): string {
  if (!raw) return '';

  let path = raw.replace(/\\/g, '/').replace(/\0/g, '');

  const segments = path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '.' && s !== '..');

  const result = segments.join('/');

  if (result.length > MAX_RELATIVE_PATH_LENGTH) return '';
  return result;
}

export function isJunkPath(pathOrName: string): boolean {
  if (!pathOrName) return false;
  const segments = pathOrName.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length === 0) return false;

  for (const seg of segments) {
    if (JUNK_SEGMENTS.has(seg.toLowerCase())) return true;
  }

  const leaf = segments[segments.length - 1].toLowerCase();
  return JUNK_NAMES.has(leaf);
}

export interface FlatTreeItem {
  relativePath: string;
  name: string;
  size: number;
  id: string;
}

export interface TreeFileNode {
  type: 'file';
  name: string;
  size: number;
  id: string;
  path: string;
}

export interface TreeFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
  fileCount: number;
  totalSize: number;
}

export type TreeNode = TreeFileNode | TreeFolderNode;

export function buildFileTree(items: FlatTreeItem[]): TreeNode[] {
  const root: TreeFolderNode = {
    type: 'folder',
    name: '',
    path: '',
    children: [],
    fileCount: 0,
    totalSize: 0,
  };

  const folderByPath = new Map<string, TreeFolderNode>();
  folderByPath.set('', root);

  const ensureFolder = (folderPath: string): TreeFolderNode => {
    const existing = folderByPath.get(folderPath);
    if (existing) return existing;

    const parts = folderPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parent = ensureFolder(parentPath);

    const node: TreeFolderNode = {
      type: 'folder',
      name,
      path: folderPath,
      children: [],
      fileCount: 0,
      totalSize: 0,
    };
    parent.children.push(node);
    folderByPath.set(folderPath, node);
    return node;
  };

  for (const item of items) {
    const safePath = sanitizeRelativePath(item.relativePath);
    const lastSlash = safePath.lastIndexOf('/');
    const dirPath = lastSlash > 0 ? safePath.slice(0, lastSlash) : '';
    const parent = ensureFolder(dirPath);

    const fileNode: TreeFileNode = {
      type: 'file',
      name: item.name,
      size: item.size,
      id: item.id,
      path: safePath && safePath.indexOf('/') !== -1 ? safePath : (dirPath ? `${dirPath}/${item.name}` : item.name),
    };
    parent.children.push(fileNode);

    let p: string | undefined = dirPath;
    while (p !== undefined) {
      const folder = folderByPath.get(p);
      if (folder) {
        folder.fileCount += 1;
        folder.totalSize += item.size;
      }
      if (p === '') break;
      const idx = p.lastIndexOf('/');
      p = idx === -1 ? '' : p.slice(0, idx);
    }
  }

  return sortNodes(root.children);
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  for (const node of nodes) {
    if (node.type === 'folder') {
      node.children = sortNodes(node.children);
    }
  }
  return nodes.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function hasFolders(items: { relativePath: string }[]): boolean {
  return items.some((it) => {
    const safe = sanitizeRelativePath(it.relativePath);
    return safe.indexOf('/') !== -1;
  });
}
