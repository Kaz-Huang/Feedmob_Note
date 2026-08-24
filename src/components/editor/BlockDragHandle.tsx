'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Plus,
  Columns,
  Sparkles,
} from 'lucide-react';
import {
  moveBlock,
  duplicateBlock,
  deleteBlock,
  getTopLevelBlockRange,
  computeBlockDropTarget,
  BLOCK_DRAG_MIME,
} from './utils/block-movement';

interface BlockDragHandleProps {
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  onTriggerSlash?: (pos: { x: number; y: number }) => void;
}

export const BlockDragHandle: React.FC<BlockDragHandleProps> = ({
  editor,
  editorContainerRef,
}) => {
  const [handleTop, setHandleTop] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDomNode, setActiveDomNode] = useState<HTMLElement | null>(null);
  const [hoveredButton, setHoveredButton] = useState<'plus' | 'grip' | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // --- Block drag & drop state (Notion-style) ---
  const dragSourceRef = useRef<{ pos: number; dom: HTMLElement } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Resolve the top-level block position of the currently hovered DOM node.
  const getActiveBlockPos = (): number | null => {
    if (!activeDomNode || !editor) return null;
    try {
      const pos = editor.view.posAtDOM(activeDomNode, 0);
      if (pos < 0) return null;
      const $pos = editor.state.doc.resolve(pos);
      return $pos.depth >= 1 ? $pos.before(1) : null;
    } catch {
      return null;
    }
  };

  // Track Alt key press for Notion tooltip toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setIsAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Track mouse position over editor blocks
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isMenuOpen) return; // Freeze position when menu is open

      const editorDom = container.querySelector('.tiptap');
      if (!editorDom) return;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element || !editorDom.contains(element)) {
        if (handleRef.current && !handleRef.current.contains(e.target as Node)) {
          // not hovering handle
        }
        return;
      }

      // Find direct child of .tiptap (depth 1 block)
      let current: HTMLElement | null = element as HTMLElement;
      while (current && current.parentElement !== editorDom) {
        current = current.parentElement;
      }

      if (current && current !== activeDomNode) {
        setActiveDomNode(current);
        const containerRect = container.getBoundingClientRect();
        const blockRect = current.getBoundingClientRect();
        const top = blockRect.top - containerRect.top + 2;
        setHandleTop(top);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [editor, editorContainerRef, isMenuOpen, activeDomNode]);

  // Notion-style blue drop indicator while dragging a block over the editor.
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const isBlockDrag = () => dragSourceRef.current !== null;

    const handleDragOver = (e: DragEvent) => {
      if (!isBlockDrag()) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const view = editor.view;
      const targetPos = computeBlockDropTarget(view, e.clientX, e.clientY);

      const editorDom = container.querySelector('.tiptap') as HTMLElement | null;
      if (targetPos === null || !editorDom) {
        setDropIndicator(null);
        return;
      }

      // The indicator line sits at the top edge of the block that starts at
      // targetPos, or at the bottom edge of the last block when appending.
      let y: number | null = null;
      const { doc } = editor.state;
      try {
        if (targetPos >= doc.content.size && doc.lastChild) {
          const lastPos = doc.content.size - doc.lastChild.nodeSize;
          const dom = view.nodeDOM(lastPos);
          if (dom instanceof HTMLElement) {
            y = dom.getBoundingClientRect().bottom;
          }
        } else {
          const dom = view.nodeDOM(targetPos);
          if (dom instanceof HTMLElement) {
            y = dom.getBoundingClientRect().top;
          }
        }
      } catch {
        y = null;
      }

      if (y === null) {
        setDropIndicator(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const editorRect = editorDom.getBoundingClientRect();
      const indicator = {
        top: y - containerRect.top,
        left: editorRect.left - containerRect.left,
        width: editorRect.width,
      };
      setDropIndicator((prev) =>
        prev && prev.top === indicator.top && prev.left === indicator.left && prev.width === indicator.width
          ? prev
          : indicator
      );
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!isBlockDrag()) return;
      if (!container.contains(e.relatedTarget as Node)) {
        setDropIndicator(null);
      }
    };

    // Safety net: drops landing in the container but outside the editor DOM
    // (padding area) must not trigger browser default behavior.
    const handleDrop = (e: DragEvent) => {
      if (!isBlockDrag()) return;
      e.preventDefault();
      setDropIndicator(null);
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [editor, editorContainerRef]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        handleRef.current &&
        !handleRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  if (!editor || handleTop === null) return null;

  const focusBlock = () => {
    if (activeDomNode && editor.view) {
      try {
        const pos = editor.view.posAtDOM(activeDomNode, 0);
        if (pos >= 0) {
          editor.commands.focus(pos + 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    focusBlock();
    const block = getTopLevelBlockRange(editor);
    if (!block) return;

    if (e.altKey) {
      // Insert above
      editor.commands.insertContentAt(block.pos, { type: 'paragraph' });
      editor.commands.focus(block.pos + 1);
    } else {
      // Insert below
      editor.commands.insertContentAt(block.pos + block.nodeSize, { type: 'paragraph' });
      editor.commands.focus(block.pos + block.nodeSize + 1);
    }
  };

  const handleTurnIntoColumns = () => {
    focusBlock();
    const block = getTopLevelBlockRange(editor);
    if (!block) return;

    // Wrap current block into a 2-column layout
    const currentJSON = block.node.toJSON();
    editor.commands.insertContentAt(
      { from: block.pos, to: block.pos + block.nodeSize },
      {
        type: 'columnList',
        attrs: { columns: 2 },
        content: [
          {
            type: 'column',
            content: [currentJSON],
          },
          {
            type: 'column',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '👉 并排右栏内容...' }] }],
          },
        ],
      }
    );

    setIsMenuOpen(false);
  };

  const handleMoveUp = () => {
    focusBlock();
    moveBlock(editor, 'up');
    setIsMenuOpen(false);
  };

  const handleMoveDown = () => {
    focusBlock();
    moveBlock(editor, 'down');
    setIsMenuOpen(false);
  };

  const handleDuplicate = () => {
    focusBlock();
    duplicateBlock(editor);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    focusBlock();
    deleteBlock(editor);
    setIsMenuOpen(false);
    setHandleTop(null);
  };

  return (
    <div
      ref={handleRef}
      style={{ top: `${handleTop}px` }}
      className="absolute left-1 z-20 flex items-center gap-0.5 select-none transition-all duration-75"
    >
      {/* 1. Plus Button (+) */}
      <div className="relative group">
        <button
          type="button"
          onClick={handlePlusClick}
          onMouseEnter={() => setHoveredButton('plus')}
          onMouseLeave={() => setHoveredButton(null)}
          className="p-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Notion-style Dark Tooltip for Plus */}
        {hoveredButton === 'plus' && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95">
            {isAltPressed ? '按住 Alt：在上方添加块' : '点击以在下方添加块 (按住 Alt 在上方添加)'}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
          </div>
        )}
      </div>

      {/* 2. Notion 6-Dot Grip Handle (⠿) */}
      <div className="relative group">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            // Notion-style block drag:
            // 1. Locate the hovered top-level block (without moving focus).
            const blockPos = getActiveBlockPos();
            if (blockPos === null || !activeDomNode) {
              e.preventDefault();
              return;
            }
            dragSourceRef.current = { pos: blockPos, dom: activeDomNode };

            // 2. Only a custom MIME type is written into the dataTransfer.
            //    NEVER 'text/plain' — ProseMirror's default drop handler
            //    would insert that text into the document (the "random
            //    number" bug: the block position being pasted as text).
            try {
              e.dataTransfer.setData(BLOCK_DRAG_MIME, String(blockPos));
            } catch {
              // Some environments restrict dataTransfer writes — the drag
              // still works via effectAllowed, only the drop would be a
              // no-op. Never fall back to text/plain here.
            }
            e.dataTransfer.effectAllowed = 'move';

            // 3. Use the block itself as the drag preview (Notion-like).
            try {
              e.dataTransfer.setDragImage(activeDomNode, 0, 16);
            } catch {
              // setDragImage is not supported everywhere — fine to ignore.
            }

            // 4. Fade the source block while dragging.
            activeDomNode.style.opacity = '0.35';
          }}
          onDragEnd={() => {
            // Fires both after a successful drop and after cancelling
            // (Esc / dropping outside) — always clean up.
            const source = dragSourceRef.current;
            if (source) {
              source.dom.style.opacity = '';
            }
            dragSourceRef.current = null;
            setDropIndicator(null);
          }}
          onClick={() => {
            focusBlock();
            setIsMenuOpen(!isMenuOpen);
          }}
          onMouseEnter={() => setHoveredButton('grip')}
          onMouseLeave={() => setHoveredButton(null)}
          className={`p-1 rounded-md cursor-grab active:cursor-grabbing transition ${
            isMenuOpen
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
          }`}
        >
          <GripVertical className="w-4.5 h-4.5" />
        </button>

        {/* Notion-style Dark Tooltip for Grip */}
        {hoveredButton === 'grip' && !isMenuOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95">
            拖动以移动 / 点击打开菜单
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
          </div>
        )}
      </div>

      {/* Popover Action Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute left-12 top-0 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 text-sm text-slate-700 dark:text-slate-300"
        >
          <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Block 块操作
          </div>

          <button
            type="button"
            onClick={handleTurnIntoColumns}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold transition"
          >
            <Columns className="w-4 h-4 text-emerald-600" />
            <span>转换为双栏同行并排</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={handleMoveUp}
            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            <div className="flex items-center gap-2.5">
              <ArrowUp className="w-4 h-4 text-blue-500" />
              <span>上移 Block</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Alt+↑</span>
          </button>

          <button
            type="button"
            onClick={handleMoveDown}
            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            <div className="flex items-center gap-2.5">
              <ArrowDown className="w-4 h-4 text-blue-500" />
              <span>下移 Block</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Alt+↓</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-slate-500" />
              <span>复制 Block</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Ctrl+D</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除 Block</span>
          </button>
        </div>
      )}

      {/* Notion-style blue drop indicator line */}
      {dropIndicator && (
        <div
          className="absolute z-30 pointer-events-none h-[3px] rounded-full bg-blue-500 shadow-[0_1px_3px_rgba(37,99,235,0.6)]"
          style={{
            top: `${dropIndicator.top}px`,
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
          }}
        />
      )}
    </div>
  );
};
