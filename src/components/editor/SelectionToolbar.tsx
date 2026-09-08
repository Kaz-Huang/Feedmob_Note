'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

// Selection formatting needs no delayed tooltip callbacks. In particular,
// switching documents must not leave a callback targeting a destroyed view.
export function SelectionToolbar({ editor, children, className }: {
  editor: Editor; children: React.ReactNode; className?: string;
}) {
  const toolbar = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const sync = () => {
      if (editor.isDestroyed) return;
      const { selection, doc } = editor.state;
      if (!editor.isFocused || !(selection instanceof TextSelection) || selection.empty || !doc.textBetween(selection.from, selection.to).trim()) {
        setPosition(null);
        return;
      }
      const from = editor.view.coordsAtPos(selection.from);
      const to = editor.view.coordsAtPos(selection.to);
      const width = toolbar.current?.offsetWidth || 200;
      setPosition({
        left: Math.max(8, Math.min((from.left + to.right - width) / 2, window.innerWidth - width - 8)),
        top: from.top >= 52 ? from.top - 48 : from.bottom + 8,
      });
    };
    editor.on('transaction', sync);
    editor.on('focus', sync);
    editor.on('blur', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      editor.off('transaction', sync);
      editor.off('focus', sync);
      editor.off('blur', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [editor]);
  if (!position) return null;
  return createPortal(
    <div ref={toolbar} role="toolbar" aria-label="文字格式" data-bubble-menu="true"
      onMouseDown={event => event.preventDefault()}
      style={{ position: 'fixed', zIndex: 60, ...position }} className={className}>
      {children}
    </div>, document.body,
  );
}
