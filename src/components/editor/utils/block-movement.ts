import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Custom MIME type used for block drag & drop.
 * IMPORTANT: never put plain text into dataTransfer for block drags —
 * ProseMirror's default drop handler would insert that text into the
 * document (this was the "random number" bug: block positions like "23"
 * being inserted as text on drop).
 */
export const BLOCK_DRAG_MIME = 'application/x-feedmob-block';


/**
 * Finds the top-level block (depth 1) containing the current selection.
 */
export function getTopLevelBlockRange(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Depth 1 is the immediate child of doc
  const depth = 1;
  if ($from.depth < depth) return null;

  const start = $from.start(depth);
  const end = $from.end(depth);
  const node = $from.node(depth);
  const index = $from.index(0); // Index in doc.content

  return {
    node,
    pos: $from.before(depth),
    start,
    end,
    nodeSize: node.nodeSize,
    index,
  };
}

/**
 * Move current top-level block UP or DOWN.
 */
export function moveBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const block = getTopLevelBlockRange(editor);
  if (!block) return false;

  const { state, view } = editor;
  const { doc, tr } = state;
  const totalChildren = doc.childCount;

  if (direction === 'up' && block.index <= 0) return false;
  if (direction === 'down' && block.index >= totalChildren - 1) return false;

  const targetIndex = direction === 'up' ? block.index - 1 : block.index + 1;

  // Calculate target position in document
  let targetPos = 0;
  for (let i = 0; i < targetIndex; i++) {
    targetPos += doc.child(i).nodeSize;
  }

  // Extract the node to move
  const nodeToMove = block.node;
  const deleteFrom = block.pos;
  const deleteTo = block.pos + block.nodeSize;

  // Execute transaction: delete and re-insert
  tr.delete(deleteFrom, deleteTo);

  // If we moved down, targetPos shifts backwards by the deleted node's size
  const insertPos = direction === 'down' ? targetPos - block.nodeSize + doc.child(targetIndex).nodeSize : targetPos;

  tr.insert(insertPos, nodeToMove);

  // Preserve selection inside the moved node
  const newSelectionPos = Math.min(insertPos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(newSelectionPos)));

  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Duplicate the current top-level block.
 */
export function duplicateBlock(editor: Editor): boolean {
  const block = getTopLevelBlockRange(editor);
  if (!block) return false;

  const { state, view } = editor;
  const { tr } = state;
  const insertPos = block.pos + block.nodeSize;

  tr.insert(insertPos, block.node);
  const newSelectionPos = Math.min(insertPos + 1, tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(newSelectionPos)));

  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Delete the current top-level block.
 */
export function deleteBlock(editor: Editor): boolean {
  const block = getTopLevelBlockRange(editor);
  if (!block) return false;

  const { state, view } = editor;
  const { tr } = state;

  tr.delete(block.pos, block.pos + block.nodeSize);
  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Compute the top-level insertion position for a block drop, given the
 * pointer coordinates (Notion semantics: the block lands between two
 * blocks, decided by whether the pointer is in the upper or lower half
 * of the hovered block).
 *
 * Returns a top-level block boundary position, or null when the
 * coordinates cannot be resolved to the document.
 */
export function computeBlockDropTarget(
  view: EditorView,
  clientX: number,
  clientY: number
): number | null {
  let coords: { pos: number; inside: number } | null = null;
  try {
    coords = view.posAtCoords({ left: clientX, top: clientY });
  } catch {
    return null;
  }
  if (!coords) return null;

  const { doc } = view.state;

  // Below the last block (bottom padding / empty area) → append at the end.
  if (coords.pos >= doc.content.size) {
    return doc.content.size;
  }

  let blockPos: number;
  try {
    const $pos = doc.resolve(coords.pos);
    if ($pos.depth >= 1) {
      blockPos = $pos.before(1);
    } else {
      // Pointer is at doc level (gap between blocks / top margin).
      blockPos = coords.pos;
    }
  } catch {
    return null;
  }

  const node = doc.nodeAt(blockPos);
  if (!node) {
    // Exactly at the end boundary.
    return doc.content.size;
  }

  // Upper half → insert before the hovered block, lower half → after it.
  const dom = view.nodeDOM(blockPos);
  if (dom instanceof HTMLElement) {
    const rect = dom.getBoundingClientRect();
    if (clientY > rect.top + rect.height / 2) {
      return blockPos + node.nodeSize;
    }
  }
  return blockPos;
}

/**
 * Move the top-level block at `sourcePos` so that it inserts at the
 * top-level boundary `targetPos` (both in the CURRENT document
 * coordinates). Content is preserved because the whole node object is
 * re-inserted.
 */
export function moveBlockToPosition(
  editor: Editor,
  sourcePos: number,
  targetPos: number
): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(sourcePos);
  if (!node || node.isBlock === false) return false;

  const size = node.nodeSize;

  // Dropping onto its own position → nothing to do.
  if (targetPos === sourcePos || targetPos === sourcePos + size) return true;

  const tr = state.tr;

  // 1. Remove the source block.
  tr.delete(sourcePos, sourcePos + size);

  // 2. Correct the target position: everything after the deleted range
  //    shifts left by `size`.
  let insertPos = targetPos > sourcePos ? targetPos - size : targetPos;
  insertPos = Math.max(0, Math.min(insertPos, tr.doc.content.size));

  // 3. Re-insert the node (with all its content) at the target.
  tr.insert(insertPos, node);

  // 4. Put the cursor inside the moved block.
  const selPos = Math.min(insertPos + 1, tr.doc.content.size);
  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(selPos)));
  } catch {
    // keep default selection
  }

  view.dispatch(tr);
  return true;
}
