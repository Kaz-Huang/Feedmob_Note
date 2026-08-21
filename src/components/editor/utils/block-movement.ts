import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, NodeSelection } from '@tiptap/pm/state';

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
