import type { EditorView } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';

const drags = new WeakMap<EditorView, { pos: number; doc: Node }>();
export function startBlockDrag(view: EditorView, pos: number) {
  drags.set(view, { pos, doc: view.state.doc });
}
export function getDraggedBlockPos(view: EditorView): number | null {
  const drag = drags.get(view);
  return drag && drag.doc === view.state.doc ? drag.pos : null;
}
export function endBlockDrag(view: EditorView) { drags.delete(view); }
