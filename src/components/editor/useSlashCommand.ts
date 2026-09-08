import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { slashCommandKey, type SlashMatch } from './extensions/SlashCommand';

export function useSlashCommand(editor: Editor | null) {
  const [match, setMatch] = useState<SlashMatch | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const close = useCallback(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(slashCommandKey, 'close'));
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const next = slashCommandKey.getState(editor.state)?.match ?? null;
      setMatch(next);
      if (next) {
        const coords = editor.view.coordsAtPos(next.from);
        setPosition({ x: coords.left, y: coords.bottom + 8 });
      }
    };
    editor.on('transaction', sync);
    window.addEventListener('resize', close);
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[role="listbox"]')) close();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      editor.off('transaction', sync);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [editor, close]);
  return { match, position, close };
}
