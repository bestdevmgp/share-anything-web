import React from 'react';
import { FolderIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import AnimatedHeight from './AnimatedHeight';
import { formatFileSize } from '../../utils/format';
import { TreeNode, TreeFile, nodeFileCount, nodeSize } from '../../utils/fileTree';
import { cn } from '../../lib/utils';

const INDENT_STEP = 16;
const INDENT_MAX = 80; // absolute cap on wide screens (~5-6 levels)
const INDENT_RESERVE = 210; // px kept for thumbnail + name + size + padding

// Left padding for a row at the given nesting depth, as a CSS expression. It
// grows per level but is capped two ways so the file name never gets pushed
// off-screen: the absolute max above, AND — via the container-query unit cqw —
// never more than (container width − reserved content). On a narrow mobile box
// the reserve term wins and indentation shrinks automatically, keeping ~68px
// for the name at any width; beyond the cap the chevron + folder icon + nesting
// order still convey hierarchy. Requires an ancestor with container-type.
export const treeIndent = (depth: number): string =>
  `min(${(depth - 1) * INDENT_STEP}px, max(0px, 100cqw - ${INDENT_RESERVE}px), ${INDENT_MAX}px)`;

interface Props {
  nodes: TreeNode[];
  // 1 for the direct children of a top-level folder card; grows with depth.
  depth: number;
  openFolders: Set<string>;
  toggleFolder: (path: string) => void;
  // Renders a single file row in full (the caller owns its layout + indent via
  // treeIndent). Lets the normal and P2P views supply their own row.
  renderFile: (file: TreeFile, depth: number) => React.ReactNode;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Renders folder + file rows recursively, indenting each level. Folder rows are
// uniform here; file rows come from the caller's renderFile.
const FolderTreeRows: React.FC<Props> = ({ nodes, depth, openFolders, toggleFolder, renderFile, t }) => (
  <>
    {nodes.map((node) => {
      if (node.kind === 'file') {
        return <React.Fragment key={node.id}>{renderFile(node, depth)}</React.Fragment>;
      }
      const isOpen = openFolders.has(node.path);
      return (
        <div key={`d:${node.path}`}>
          <div
            data-row
            onClick={() => toggleFolder(node.path)}
            className="flex items-center py-2 pr-1 cursor-pointer rounded-md can-hover:hover:bg-accent active:bg-accent transition-colors"
            style={{ paddingLeft: treeIndent(depth) }}
          >
            <div className="flex-shrink-0 mr-2.5">
              <div className="w-9 h-9 rounded-lg bg-background border border-foreground/[0.09] flex items-center justify-center">
                <FolderIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('upload.folderItemCount', { count: nodeFileCount(node) })} · {formatFileSize(nodeSize(node))}
              </p>
            </div>
            <ChevronDownIcon
              className={cn('w-4 h-4 text-muted-foreground/60 transition-transform flex-shrink-0 ml-1', isOpen && 'rotate-180')}
            />
          </div>
          <AnimatedHeight>
            {isOpen && (
              <FolderTreeRows
                nodes={node.children}
                depth={depth + 1}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                renderFile={renderFile}
                t={t}
              />
            )}
          </AnimatedHeight>
        </div>
      );
    })}
  </>
);

export default FolderTreeRows;
