import React from 'react';
import { FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { formatFileSize } from '../../utils/format';
import { TreeNode, TreeFile, TreeFolder, nodeFileCount, nodeSize } from '../../utils/fileTree';
import { cn } from '../../lib/utils';
import Collapsible from './Collapsible';

const INDENT_STEP = 16;
const INDENT_MAX = 80;
const INDENT_RESERVE = 210; // px kept for thumbnail + name + size + padding

// Left padding for a row at the given nesting depth, as a CSS expression. It
// grows per level but is capped two ways so the file name never gets pushed
// off-screen: the absolute max above, AND — via the container-query unit cqw —
// never more than (container width − reserved content). On a narrow mobile box
// the reserve term wins and indentation shrinks automatically. Requires an
// ancestor with container-type: inline-size.
export const treeIndent = (depth: number): string =>
  `min(${(depth - 1) * INDENT_STEP}px, max(0px, 100cqw - ${INDENT_RESERVE}px), ${INDENT_MAX}px)`;

interface Props {
  nodes: TreeNode[];
  // 1 for the direct children of a top-level folder card; grows with depth.
  depth: number;
  openFolders: Set<string>;
  toggleFolder: (path: string) => void;
  // Renders one file row in full (caller owns layout; indent via treeIndent(depth)).
  renderFile: (file: TreeFile, depth: number) => React.ReactNode;
  // Optional action shown on each folder row, after the chevron (e.g. remove) —
  // matching the top-level folder row's [collapse/expand][remove] order.
  renderFolderTrailing?: (folder: TreeFolder, depth: number) => React.ReactNode;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Renders folder + file rows recursively, indenting each level. Folder rows are
// uniform here (same 44px leading + padding as file rows); file rows come from
// the caller's renderFile.
const FolderTreeRows: React.FC<Props> = ({ nodes, depth, openFolders, toggleFolder, renderFile, renderFolderTrailing, t }) => (
  <>
    {nodes.map((node) => {
      if (node.kind === 'file') {
        return <React.Fragment key={node.id}>{renderFile(node, depth)}</React.Fragment>;
      }
      // A folder with no files anywhere has no children: show it, but it can't
      // be expanded (nothing inside).
      const isEmpty = node.children.length === 0;
      const isOpen = !isEmpty && openFolders.has(node.path);
      return (
        <div key={`d:${node.path}`}>
          <div
            data-row
            onClick={isEmpty ? undefined : (e) => { e.stopPropagation(); toggleFolder(node.path); }}
            className={cn(
              'flex items-center gap-3 -mx-2.5 px-2.5 py-2 rounded-lg transition-colors',
              !isEmpty && 'cursor-pointer can-hover:hover:bg-accent active:bg-accent'
            )}
            style={{ marginLeft: `calc(-0.625rem + ${treeIndent(depth)})` }}
          >
            <div className="flex-shrink-0 w-11 h-11 rounded bg-background flex items-center justify-center">
              <FolderIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
              <p className="text-xs text-muted-foreground">
                {isEmpty
                  ? t('upload.folderEmpty')
                  : `${t('upload.folderItemCount', { count: nodeFileCount(node) })} · ${formatFileSize(nodeSize(node))}`}
              </p>
            </div>
            {!isEmpty && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <ChevronDownIcon
                  className={cn('w-5 h-5 text-muted-foreground/60 transition-transform', isOpen && 'rotate-180')}
                />
                {renderFolderTrailing?.(node, depth)}
              </div>
            )}
          </div>
          {/* Each level animates independently via grid-rows; open ancestors track
              the child's growth in real time, so even deep expansions stay one
              smooth motion with no per-level domino. */}
          <Collapsible open={isOpen}>
            <FolderTreeRows
              nodes={node.children}
              depth={depth + 1}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              renderFile={renderFile}
              renderFolderTrailing={renderFolderTrailing}
              t={t}
            />
          </Collapsible>
        </div>
      );
    })}
  </>
);

export default FolderTreeRows;
