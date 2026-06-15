import React, { useMemo, useState } from 'react';
import { ChevronRightIcon, FolderIcon } from '@heroicons/react/24/outline';
import { cn } from 'lib/utils';
import { formatFileSize } from '../utils/format';
import {
  buildFileTree,
  FlatTreeItem,
  TreeNode,
  TreeFileNode,
  TreeFolderNode,
} from '../utils/folderPath';

export interface FileTreeProps {
  items: FlatTreeItem[];
  renderFileLeading?: (item: FlatTreeItem) => React.ReactNode;
  renderFileTrailing?: (item: FlatTreeItem) => React.ReactNode;
  onFileClick?: (item: FlatTreeItem) => void;
  defaultExpanded?: boolean;
  className?: string;
}

const INDENT_PX = 18;

const FileTree: React.FC<FileTreeProps> = ({
  items,
  renderFileLeading,
  renderFileTrailing,
  onFileClick,
  defaultExpanded = true,
  className,
}) => {
  const itemById = useMemo(() => {
    const m = new Map<string, FlatTreeItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const nodes = useMemo(() => buildFileTree(items), [items]);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isExpanded = (path: string) =>
    path in overrides ? overrides[path] : defaultExpanded;
  const toggle = (path: string) =>
    setOverrides((prev) => ({ ...prev, [path]: !(path in prev ? prev[path] : defaultExpanded) }));

  const renderFile = (node: TreeFileNode, depth: number) => {
    const item = itemById.get(node.id);
    if (!item) return null;
    const leading = renderFileLeading?.(item);
    const trailing = renderFileTrailing?.(item);
    return (
      <div
        key={`f:${node.id}`}
        onClick={
          onFileClick
            ? (e) => {
                e.stopPropagation();
                onFileClick(item);
              }
            : undefined
        }
        className={cn(
          'flex items-center gap-2 py-2 pr-2 rounded-lg transition-colors',
          onFileClick && 'cursor-pointer can-hover:hover:bg-accent active:bg-accent'
        )}
        style={{ paddingLeft: depth * INDENT_PX + 8 }}
      >
        {leading}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(node.size)}</p>
        </div>
        {trailing}
      </div>
    );
  };

  const renderFolder = (node: TreeFolderNode, depth: number) => {
    const expanded = isExpanded(node.path);
    return (
      <div key={`d:${node.path}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle(node.path);
          }}
          className="w-full flex items-center gap-2 py-2 pr-2 rounded-lg can-hover:hover:bg-accent active:bg-accent transition-colors text-left"
          style={{ paddingLeft: depth * INDENT_PX + 4 }}
          aria-expanded={expanded}
        >
          <ChevronRightIcon
            className={cn(
              'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform',
              expanded && 'rotate-90'
            )}
          />
          <FolderIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
            {node.name}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {node.fileCount} · {formatFileSize(node.totalSize)}
          </span>
        </button>
        {expanded && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode =>
    node.type === 'folder' ? renderFolder(node, depth) : renderFile(node, depth);

  return <div className={cn('space-y-0.5', className)}>{nodes.map((n) => renderNode(n, 0))}</div>;
};

export default FileTree;
