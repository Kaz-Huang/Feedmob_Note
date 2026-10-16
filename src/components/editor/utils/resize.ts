import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';

export function boundedSize(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value);
  return value != null && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

/** Preview in the DOM, then commit one document/history change on release. */
export function trackResize(event: PointerEvent, element: HTMLElement, preview: (x: number, y: number) => void, finish: (cancelled: boolean) => void) {
  if (event.button !== 0) return () => {};
  event.preventDefault();
  event.stopPropagation();
  const doc = element.ownerDocument;
  // Keep receiving moves/releases when the pointer crosses embedded iframes.
  try { element.setPointerCapture(event.pointerId); } catch { /* Detached handles cannot capture. */ }
  const previousCursor = doc.body.style.cursor;
  const previousSelect = doc.body.style.userSelect;
  doc.body.style.cursor = getComputedStyle(element).cursor;
  doc.body.style.userSelect = 'none';
  const move = (next: PointerEvent) => {
    if (next.pointerId !== event.pointerId) return;
    next.preventDefault();
    preview(next.clientX, next.clientY);
  };
  let done = false;
  const stop = (cancelled: boolean) => {
    if (done) return;
    done = true;
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', cancel);
    doc.removeEventListener('keydown', key, true);
    doc.defaultView?.removeEventListener('blur', cancel);
    element.removeEventListener('lostpointercapture', cancel);
    try { if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId); } catch { /* The view may have been removed. */ }
    doc.body.style.cursor = previousCursor;
    doc.body.style.userSelect = previousSelect;
    finish(cancelled);
  };
  const up = (next: PointerEvent) => { if (next.pointerId === event.pointerId) { move(next); stop(false); } };
  const cancel = () => stop(true);
  const key = (next: KeyboardEvent) => {
    if (next.key === 'Escape') { next.preventDefault(); next.stopPropagation(); stop(true); }
  };
  doc.addEventListener('pointermove', move, { passive: false });
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', cancel);
  doc.addEventListener('keydown', key, true);
  doc.defaultView?.addEventListener('blur', cancel);
  element.addEventListener('lostpointercapture', cancel);
  return cancel;
}

export function commitNodeSize(editor: Editor, getPos: () => number | undefined, type: string, attrs: Record<string, unknown>) {
  if (editor.isDestroyed || !editor.isEditable) return;
  const pos = getPos();
  if (typeof pos !== 'number') return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== type || Object.entries(attrs).every(([key, value]) => node.attrs[key] === value)) return;
  editor.view.dispatch(closeHistory(editor.state.tr).setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  editor.view.dispatch(closeHistory(editor.state.tr));
}
