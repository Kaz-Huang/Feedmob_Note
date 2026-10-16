'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import type { SelectionBookmark } from '@tiptap/pm/state';
import { Link2, X } from 'lucide-react';

export function EditorLinkPopover({ editor, isOpen, onClose }: { editor: Editor; isOpen: boolean; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const bookmark = useRef<SelectionBookmark | null>(null);
  const panel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    bookmark.current = editor.state.selection.getBookmark();
    setUrl(editor.getAttributes('link').href || '');
    setError('');
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    setPosition({ left: Math.max(8, Math.min(coords.left, window.innerWidth - 328)), top: Math.max(8, Math.min(coords.bottom + 8, window.innerHeight - 180)) });
    const map = ({ transaction }: { transaction: import('@tiptap/pm/state').Transaction }) => {
      bookmark.current = bookmark.current?.map(transaction.mapping) ?? null;
    };
    const dismiss = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node)) onClose(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); editor.commands.focus(); } };
    editor.on('transaction', map);
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', escape);
    panel.current?.querySelector('input')?.focus();
    return () => { editor.off('transaction', map); document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', escape); };
  }, [editor, isOpen, onClose]);

  const apply = (remove = false) => {
    let href = url.trim();
    if (!remove && href) {
      if (!/^[a-z][a-z\d+.-]*:/i.test(href)) href = 'https://' + href;
      try {
        const parsed = new URL(href);
        if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol) || (parsed.protocol !== 'mailto:' && !parsed.hostname)) throw new Error();
      } catch { setError('请输入有效的网页地址或 mailto: 邮箱地址'); return; }
    }
    if (bookmark.current) editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
    const chain = editor.chain().focus().extendMarkRange('link');
    if (remove || !href) chain.unsetLink().run();
    else chain.setLink({ href }).run();
    onClose();
  };
  if (!isOpen) return null;
  return createPortal(<form ref={panel} role="dialog" aria-label="编辑链接" className="link-popover popover-panel" style={{ position: 'fixed', zIndex: 70, ...position }} onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="flex items-center justify-between mb-2"><label htmlFor="editor-link" className="flex items-center gap-2 text-sm"><Link2 size={15} />链接地址</label><button type="button" aria-label="关闭链接面板" className="icon-button" onClick={onClose}><X size={15} /></button></div>
    <input id="editor-link" autoFocus type="text" value={url} onChange={event => { setUrl(event.target.value); setError(''); }} placeholder="https://example.com" className="link-input" aria-invalid={!!error} aria-describedby={error ? 'editor-link-error' : undefined} />
    {error && <p id="editor-link-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    <div className="flex justify-between items-center mt-3"><button type="button" onClick={() => apply(true)} className="quiet-button">移除链接</button><button type="submit" className="primary-button">应用</button></div>
  </form>, document.body);
}
