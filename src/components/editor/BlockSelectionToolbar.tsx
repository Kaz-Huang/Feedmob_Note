'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { ArrowDown, ArrowUp, Copy, Trash2, X } from 'lucide-react';
import { TextSelection } from '@tiptap/pm/state';
import { selectedBlockRange, duplicateSelectedBlocks, deleteSelectedBlocks, moveSelectedBlocks } from './extensions/BlockSelection';

export function BlockSelectionToolbar({ editor }: { editor: Editor }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(selectedBlockRange(editor.state)?.positions.length ?? 0);
    sync();
    editor.on('transaction', sync);
    return () => { editor.off('transaction', sync); };
  }, [editor]);
  if (count < 2) return null;
  const release = () => {
    const range = selectedBlockRange(editor.state);
    if (range) editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(range.anchor + 1))));
    editor.commands.focus();
  };
  return createPortal(<div role="toolbar" aria-label="所选块操作" className="block-selection-toolbar selection-toolbar" onMouseDown={event => event.preventDefault()}>
    <span role="status" className="px-2 text-xs whitespace-nowrap">已选 {count} 个块</span>
    <span className="toolbar-separator" />
    <button type="button" aria-label="上移所选块" title="上移（Alt ↑）" onClick={() => moveSelectedBlocks(editor, 'up')}><ArrowUp size={15} /></button>
    <button type="button" aria-label="下移所选块" title="下移（Alt ↓）" onClick={() => moveSelectedBlocks(editor, 'down')}><ArrowDown size={15} /></button>
    <button type="button" aria-label="复制所选块" title="复制（⌘ / Ctrl D）" onClick={() => duplicateSelectedBlocks(editor)}><Copy size={15} /></button>
    <button type="button" aria-label="删除所选块" title="删除所选块" onClick={() => deleteSelectedBlocks(editor)}><Trash2 size={15} /></button>
    <button type="button" aria-label="取消块选择" title="取消选择（Esc）" onClick={release}><X size={15} /></button>
  </div>, document.body);
}
