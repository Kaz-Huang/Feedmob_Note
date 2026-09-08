'use client';

import React, { useState, useEffect, useRef } from 'react';
import { startBlockDrag, getDraggedBlockPos, endBlockDrag } from './utils/block-drag';
import { BLOCK_TYPES, canConvertBlock, convertBlock, type BlockType } from './utils/block-conversion';
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
  Rows,
} from 'lucide-react';
import {
  moveBlockAtPos,
  duplicateBlockAtPos,
  deleteBlockAtPos,
  insertParagraphNear,
  turnBlockIntoColumns,
  resolveDomBlockPos,
  computeBlockDropTarget,
  getEnclosingColumnList,
  unwrapColumnList,
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
  const [handleLeft, setHandleLeft] = useState<number>(8);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDomNode, setActiveDomNode] = useState<HTMLElement | null>(null);
  const [hoveredButton, setHoveredButton] = useState<'plus' | 'grip' | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Block drag & drop state (Notion-style) ---
  const dragSourceRef = useRef<{ pos: number; dom: HTMLElement } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    isVertical: boolean;
  } | null>(null);

  // Resolve the block position of the currently hovered DOM node.
  // Handles every block kind uniformly (text blocks, atoms like mermaid,
  // whole column rows when hovering the gap between columns).
  const getActiveBlockPos = (): number | null => {
    if (!activeDomNode || !editor?.view) return null;
    return resolveDomBlockPos(editor.view, activeDomNode);
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

  // Track mouse position over editor blocks with robust boundary & hover detection
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isMenuOpen || isDragging) return; // Freeze position when menu or dragging is active

      // If mouse is currently inside the handle element, do not calculate or hide
      if (handleRef.current && handleRef.current.contains(e.target as Node)) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        return;
      }

      const editorDom = container.querySelector('.tiptap');
      if (!editorDom) return;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (!element || !editorDom.contains(element)) {
        // Mouse left the editor blocks (title, padding…): hide the handle
        // instead of leaving it parked next to the last hovered block.
        if (activeDomNode && !hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => { setActiveDomNode(null); setHandleTop(null); hideTimeoutRef.current = null; }, 250);
        }
        return;
      }

      // Check if element is inside a column: [data-type="column"]
      const columnEl = element.closest('[data-type="column"]');
      let current: HTMLElement | null = element as HTMLElement;

      if (columnEl && editorDom.contains(columnEl)) {
        // Find direct child of the column (the inner block)
        while (current && current.parentElement !== columnEl && current !== columnEl) {
          current = current.parentElement;
        }
      } else {
        // Direct child of .tiptap (top-level block)
        while (current && current.parentElement !== editorDom) {
          current = current.parentElement;
        }
      }

      if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
      const listItem = element.closest('li');
      if (listItem && editorDom.contains(listItem)) current = listItem;
      if (current) {
        setActiveDomNode(current);
        const containerRect = container.getBoundingClientRect();
        const blockRect = current.getBoundingClientRect();
        const top = blockRect.top - containerRect.top + 2;

        let left = 8;
        // If current element is inside a column, position the handle immediately to the left of this block
        if (columnEl && editorDom.contains(columnEl)) {
          const colRect = columnEl.getBoundingClientRect();
          if (colRect.left > containerRect.left + 60) {
            left = Math.max(8, colRect.left - containerRect.left - 48);
          }
        }

        setHandleTop(top);
        setHandleLeft(left);

        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      }
    };

    const handleMouseLeave = () => {
      if (isMenuOpen || isDragging) return;
      setActiveDomNode(null);
      setHandleTop(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
    };
  }, [editor, editorContainerRef, isMenuOpen, isDragging, activeDomNode]);

  // Notion-style blue drop indicator while dragging a block over the editor.
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const isBlockDrag = () => getDraggedBlockPos(editor.view) !== null;

    const handleDragOver = (e: DragEvent) => {
      if (!isBlockDrag()) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

      const view = editor.view;
      const sourcePos = getDraggedBlockPos(view);
      const dropTarget = sourcePos === null
        ? null
        : computeBlockDropTarget(view, e.clientX, e.clientY, { sourcePos });

      const editorDom = container.querySelector('.tiptap') as HTMLElement | null;
      if (!dropTarget || !editorDom) {
        setDropIndicator(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const indicator = {
        top: dropTarget.indicator.top - containerRect.top,
        left: dropTarget.indicator.left - containerRect.left,
        width: dropTarget.indicator.width,
        height: dropTarget.indicator.height,
        isVertical: dropTarget.indicator.isVertical,
      };

      setDropIndicator((prev) =>
        prev &&
        prev.top === indicator.top &&
        prev.left === indicator.left &&
        prev.width === indicator.width &&
        prev.height === indicator.height &&
        prev.isVertical === indicator.isVertical
          ? prev
          : indicator
      );
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!isBlockDrag()) return;
      if (!e.relatedTarget || !container.contains(e.relatedTarget as Node)) {
        setDropIndicator(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      // Full cleanup MUST happen here: resetting handleTop below unmounts the
      // draggable button, so a later `dragend` may never fire. Leaving the
      // drag state stuck would freeze the handle (it only re-appears on
      // mousemove while !isDragging) and leak __feedmobDraggedBlockPos.
      endBlockDrag(editor.view);
      document.querySelectorAll('.feedmob-drag-source-active').forEach((el) => {
        el.classList.remove('feedmob-drag-source-active');
      });
      dragSourceRef.current = null;
      setIsDragging(false);
      setDropIndicator(null);
      // The doc just changed under the pointer — the cached hover block is
      // stale, so recompute the handle position from the next mousemove.
      setActiveDomNode(null);
      setHandleTop(null);
    };

    window.addEventListener('dragover', handleDragOver, { passive: false });
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragend', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragend', handleDrop);
      endBlockDrag(editor.view);
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

  if (!editor) return null;

  const focusBlock = () => {
    if (!activeDomNode || !editor?.view) return;
    const pos = resolveDomBlockPos(editor.view, activeDomNode);
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    try {
      if (node.isAtom || node.isLeaf) {
        // Atom blocks have no inner text position — keep the current caret
        // instead of letting it escape into a neighbouring block.
        editor.chain().focus().setNodeSelection(pos).run();
      } else {
        editor.commands.focus(pos + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = getActiveBlockPos();
    if (pos === null) return;
    if (insertParagraphNear(editor, pos, e.altKey ? 'above' : 'below')) editor.commands.insertContent('/');
  };

  const handleTurnIntoColumns = () => {
    const pos = getActiveBlockPos();
    if (pos === null) return;
    turnBlockIntoColumns(editor, pos);
    setIsMenuOpen(false);
  };

  const handleMoveUp = () => {
    const pos = getActiveBlockPos();
    if (pos !== null) moveBlockAtPos(editor, pos, 'up');
    setIsMenuOpen(false);
  };

  const handleMoveDown = () => {
    const pos = getActiveBlockPos();
    if (pos !== null) moveBlockAtPos(editor, pos, 'down');
    setIsMenuOpen(false);
  };

  const handleDuplicate = () => {
    const pos = getActiveBlockPos();
    if (pos !== null) duplicateBlockAtPos(editor, pos);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    const pos = getActiveBlockPos();
    if (pos !== null) deleteBlockAtPos(editor, pos);
    setIsMenuOpen(false);
    setActiveDomNode(null);
    setHandleTop(null);
  };

  return (
    <>
      {/* 1. Floating Action Handle (only when handleTop !== null) */}
      {handleTop !== null && (
        <div
          ref={handleRef}
          data-block-handle="true"
          style={{
            top: `${handleTop}px`,
            left: `${handleLeft}px`,
            opacity: isDragging ? 0 : 1,
          }}
          className="absolute z-20 flex items-center gap-1 select-none transition-opacity duration-150"
        >
          {/* 1. Notion Plus Button (+) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              aria-label="添加块"
              onClick={handlePlusClick}
              onMouseEnter={() => setHoveredButton('plus')}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700 shadow-2xs"
              title=""
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Notion-style Dark Tooltip for Plus */}
            {hoveredButton === 'plus' && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95">
                {isAltPressed ? '在上方添加块 (Alt)' : '点击在下方添加块 (Alt+点击在上方)'}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
              </div>
            )}
          </div>

          {/* 2. Notion 6-Dot Grip Handle (⠿) */}
          <div className="relative">
            <button
              type="button"
              aria-label="块操作菜单"
              aria-expanded={isMenuOpen}
              draggable
              onDragStart={(e) => {
                const blockPos = getActiveBlockPos();
                if (blockPos === null || !activeDomNode) {
                  e.preventDefault();
                  return;
                }
                const sourceDom = activeDomNode;
                dragSourceRef.current = { pos: blockPos, dom: sourceDom };
                startBlockDrag(editor.view, blockPos);
                setIsDragging(true);

                try {
                  e.dataTransfer.setData(BLOCK_DRAG_MIME, String(blockPos));
                } catch {}
                e.dataTransfer.effectAllowed = 'move';

                // 1. Create a pristine Notion-style floating drag snapshot
                const isDark = document.documentElement.classList.contains('dark');
                const dragGhost = document.createElement('div');
                dragGhost.className = 'feedmob-drag-ghost-preview';
                dragGhost.style.position = 'fixed';
                dragGhost.style.top = '-9999px';
                dragGhost.style.left = '-9999px';
                dragGhost.style.width = `${Math.min(Math.max(sourceDom.offsetWidth, 160), 380)}px`;
                dragGhost.style.maxWidth = '380px';
                dragGhost.style.padding = '8px 14px';
                dragGhost.style.borderRadius = '10px';
                dragGhost.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                dragGhost.style.color = isDark ? '#f1f5f9' : '#0f172a';
                dragGhost.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)';
                dragGhost.style.border = isDark ? '1px solid #334155' : '1px solid #e2e8f0';
                dragGhost.style.opacity = '0.92';
                dragGhost.style.pointerEvents = 'none';
                dragGhost.style.zIndex = '999999';
                dragGhost.style.overflow = 'hidden';
                dragGhost.style.textOverflow = 'ellipsis';
                dragGhost.style.whiteSpace = 'nowrap';
                dragGhost.style.fontSize = '14px';
                dragGhost.style.lineHeight = '1.5';
                dragGhost.style.fontFamily = 'inherit';

                const textContent = sourceDom.innerText?.trim() || sourceDom.textContent?.trim() || 'Block 内容';
                dragGhost.innerText = textContent;

                document.body.appendChild(dragGhost);

                try {
                  e.dataTransfer.setDragImage(dragGhost, 16, 16);
                } catch {}

                setTimeout(() => {
                  if (dragGhost.parentNode) {
                    dragGhost.parentNode.removeChild(dragGhost);
                  }
                }, 0);

                // 2. Notion-style dimming and grayscale effect on source block in document
                requestAnimationFrame(() => {
                  if (sourceDom) {
                    sourceDom.classList.add('feedmob-drag-source-active');
                  }
                });
              }}
              onDragEnd={() => {
                endBlockDrag(editor.view);
                const source = dragSourceRef.current;
                if (source && source.dom) {
                  source.dom.classList.remove('feedmob-drag-source-active');
                  source.dom.style.opacity = '';
                  source.dom.style.filter = '';
                  source.dom.style.transition = '';
                }
                document.querySelectorAll('.feedmob-drag-source-active').forEach((el) => {
                  el.classList.remove('feedmob-drag-source-active');
                });
                dragSourceRef.current = null;
                setIsDragging(false);
                setDropIndicator(null);
                // Doc may have changed on drop — drop the stale hover block
                // and let the next mousemove re-anchor the handle.
                setActiveDomNode(null);
                setHandleTop(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                focusBlock();
                setIsMenuOpen(!isMenuOpen);
              }}
              onMouseEnter={() => setHoveredButton('grip')}
              onMouseLeave={() => setHoveredButton(null)}
              className={`w-6 h-6 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition border shadow-2xs ${
                isMenuOpen
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200/60 dark:hover:border-slate-700'
              }`}
              title=""
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>

            {/* Notion-style Dark Tooltip for Grip */}
            {hoveredButton === 'grip' && !isMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in zoom-in-95">
                拖到上下方调整顺序 · 拖到左右侧并排分栏 · 单击打开菜单
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
              </div>
            )}
          </div>

          {/* Popover Action Menu */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="块操作"
              onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setIsMenuOpen(false); editor.commands.focus(); } }}
              className="absolute left-0 sm:left-12 top-8 w-60 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 text-sm text-slate-700 dark:text-slate-300"
            >
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Block 块操作
              </div>

              {getActiveBlockPos() !== null && canConvertBlock(editor, getActiveBlockPos()!) && (
                <label className="px-3 py-2 flex items-center gap-2">
                  <span className="shrink-0">转换为</span>
                  <select aria-label="转换块类型" value="" className="w-full bg-transparent border rounded px-2 py-1"
                    onChange={(event) => {
                      const pos = getActiveBlockPos();
                      if (pos !== null) convertBlock(editor, pos, event.target.value as BlockType);
                      setIsMenuOpen(false);
                    }}>
                    <option value="" disabled>选择类型</option>
                    {BLOCK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              )}

              <button
                type="button"
                onClick={handleTurnIntoColumns}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold transition"
              >
                <Columns className="w-4 h-4 text-emerald-600" />
                <span>转换为双栏同行并排</span>
              </button>

              {editor && getEnclosingColumnList(editor, getActiveBlockPos() ?? undefined) && (
                <button
                  type="button"
                  onClick={() => {
                    const pos = getActiveBlockPos();
                    if (pos !== null) unwrapColumnList(editor, pos);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold transition"
                >
                  <Rows className="w-4 h-4 text-amber-600" />
                  <span>解散分栏 / 还原为独立段落</span>
                </button>
              )}

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
        </div>
      )}

      {/* 2. Notion-style Pure Glowing Blue Drop Indicator Line (OUTSIDE the handle div, positioned relative to containerRef) */}
      {dropIndicator && (
        <div
          data-testid="block-drop-indicator"
          data-orientation={dropIndicator.isVertical ? 'vertical' : 'horizontal'}
          className="absolute z-30 pointer-events-none rounded-full bg-[#2383E2] shadow-[0_0_6px_rgba(35,131,226,0.45)] transition-all duration-75"
          style={{
            top: `${dropIndicator.top}px`,
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
            height: `${dropIndicator.height}px`,
          }}
        />
      )}
    </>
  );
};
