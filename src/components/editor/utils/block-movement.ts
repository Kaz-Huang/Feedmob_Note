import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { convertBlock } from './block-conversion';

/**
 * Custom MIME type used for block drag & drop.
 * IMPORTANT: never put plain text into dataTransfer for block drags —
 * ProseMirror's default drop handler would insert that text into the
 * document (this was the "random number" bug: block positions like "23"
 * being inserted as text on drop).
 */
export const BLOCK_DRAG_MIME = 'application/x-feedmob-block';

/** Column layout containers — these wrap blocks but are never "the block". */
const COLUMN_TYPES = new Set(['column', 'columnList']);

export function isEmptyParagraph(node: ProseMirrorNode | null | undefined): boolean {
  return !!node && node.type.name === 'paragraph' && node.content.size === 0;
}

/**
 * Resolve the document position of the block node rendered by `dom`.
 *
 * `view.posAtDOM(el, 0)` returns different positions depending on node kind:
 * - content blocks (paragraph, heading, taskList…): just INSIDE the block
 * - atom/leaf blocks (mermaid, whiteboard, embed, hr): the block's own
 *   position (NodeViewDesc.border === 0)
 *
 * This helper normalizes both — plus the gap of a column row, which resolves
 * to the enclosing columnList — into the block's own position. Every caller
 * (drag handle, drop target, menu actions) must go through here so a
 * mermaid block, a paragraph and a column row all resolve consistently.
 */
export function resolveDomBlockPos(view: EditorView, dom: HTMLElement): number | null {
  try {
    const pos = view.posAtDOM(dom, 0);
    if (pos == null || pos < 0) return null;
    const { doc } = view.state;

    // Atom/leaf blocks: the returned position IS the node's own position.
    const atPos = doc.nodeAt(pos);
    if (
      atPos &&
      atPos.isBlock &&
      !COLUMN_TYPES.has(atPos.type.name) &&
      view.nodeDOM(pos) === dom
    ) {
      return pos;
    }

    // Content blocks: walk up from the inner position to the block itself.
    const $pos = doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) {
      const n = $pos.node(d);
      if (n.isBlock && !COLUMN_TYPES.has(n.type.name) && view.nodeDOM($pos.before(d)) === dom) {
        return $pos.before(d);
      }
    }

    // Only column containers enclose the point (hovering the gap between
    // columns): the row itself is the block.
    return $pos.depth >= 1 ? $pos.before(1) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the block containing (or adjacent to) the current selection.
 * Used by keyboard shortcuts (Alt+↑/↓, Ctrl+D).
 */
export function getBlockPosFromSelection(editor: Editor): number | null {
  const { state } = editor;
  const { $from } = state.selection;

  if (state.selection instanceof NodeSelection) return state.selection.from;
  // A list item (including its checkbox and nested children) is one block.
  for (let depth = $from.depth; depth > 0; depth--) {
    if (['listItem', 'taskItem'].includes($from.node(depth).type.name)) return $from.before(depth);
  }

  if ($from.depth >= 1 && ($from.node($from.depth)?.isBlock ?? false)) {
    return $from.before($from.depth);
  }
  // Depth 0 (gap cursor / node selection at top level): use an adjacent block.
  const after = $from.nodeAfter;
  if (after && after.isBlock) return $from.pos;
  const before = $from.nodeBefore;
  if (before && before.isBlock) return $from.pos - before.nodeSize;
  return null;
}

/**
 * Checks if the given position (or current selection) is inside a columnList.
 * Also accepts the position of the columnList itself (hovering the row gap).
 */
export function getEnclosingColumnList(
  editor: Editor,
  fromPos?: number
): { node: ProseMirrorNode; pos: number; nodeSize: number } | null {
  const { state } = editor;
  const pos = fromPos ?? state.selection.from;
  if (pos < 0 || pos > state.doc.content.size) return null;

  try {
    const at = state.doc.nodeAt(pos);
    if (at && at.type.name === 'columnList') {
      return { node: at, pos, nodeSize: at.nodeSize };
    }
    const $pos = state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) {
      const node = $pos.node(d);
      if (node.type.name === 'columnList') {
        return { node, pos: $pos.before(d), nodeSize: node.nodeSize };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Unwraps a columnList back into sequential top-level blocks.
 */
export function unwrapColumnList(editor: Editor, pos?: number): boolean {
  const colList = getEnclosingColumnList(editor, pos);
  if (!colList) return false;

  const { state, view } = editor;
  const { tr } = state;

  const extractedBlocks: ProseMirrorNode[] = [];
  colList.node.forEach((col) => {
    col.forEach((block) => {
      extractedBlocks.push(block);
    });
  });

  if (extractedBlocks.length === 0) {
    tr.replaceWith(colList.pos, colList.pos + colList.nodeSize, state.schema.nodes.paragraph.create());
  } else {
    tr.replaceWith(colList.pos, colList.pos + colList.nodeSize, extractedBlocks);
  }

  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Move the block at `blockPos` up/down **within its own parent**. When the
 * block sits at the parent's edge (or is a bare column, whose siblings are
 * horizontal), the enclosing block moves instead — so blocks nested in
 * lists / callouts / columns swap with their siblings in context instead of
 * teleporting to an unrelated top-level position.
 */
export function moveBlockAtPos(
  editor: Editor,
  blockPos: number,
  direction: 'up' | 'down'
): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isBlock) return false;

  const $pos = state.doc.resolve(blockPos);
  const parent = $pos.parent;
  const depth = $pos.depth; // parent depth; 0 when the parent is the doc
  const index = $pos.index();

  // Columns are horizontal siblings — a vertical move relocates the whole row.
  const isColumnMove = node.type.name === 'column';
  const atEdge =
    direction === 'up' ? index === 0 : index === parent.childCount - 1;

  if (isColumnMove || atEdge) {
    if (depth <= 0) return false; // top-level block already at the doc edge
    return moveBlockAtPos(editor, $pos.before(depth), direction);
  }

  // Position arithmetic inside the parent (avoid relying on resolvedPos
  // start()/index() semantics): offset of this block within the parent…
  let offset = 0;
  for (let i = 0; i < index; i++) offset += parent.child(i).nodeSize;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  let siblingPos = blockPos - offset;
  for (let i = 0; i < targetIndex; i++) {
    siblingPos += parent.child(i).nodeSize;
  }
  // The parent keeps other children (we only move at non-edge indices), so
  // the deletion never empties the parent and position mapping stays simple.
  const tr = state.tr;
  const sibling = parent.child(targetIndex);
  const safeInsert = direction === 'up' ? siblingPos : blockPos + sibling.nodeSize;
  const replaceFrom = Math.min(blockPos, siblingPos);
  const replaceTo = Math.max(blockPos + node.nodeSize, siblingPos + sibling.nodeSize);
  const replacement = direction === 'up' ? [node, sibling] : [sibling, node];
  // Swap atomically: deleting a required first paragraph can cause schema
  // auto-filling and silently introduce an extra paragraph.
  tr.replaceWith(replaceFrom, replaceTo, replacement);
  if (!tr.docChanged) return false;

  try {
    const offset = state.selection.from >= blockPos && state.selection.to <= blockPos + node.nodeSize
      ? state.selection.from - blockPos : 1;
    tr.setSelection(state.selection instanceof NodeSelection
      ? NodeSelection.create(tr.doc, safeInsert)
      : TextSelection.near(tr.doc.resolve(Math.min(safeInsert + offset, tr.doc.content.size))));
  } catch {}

  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Move the block around the current selection up/down (Alt+↑/↓).
 */
export function moveBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const pos = getBlockPosFromSelection(editor);
  if (pos === null) return false;
  return moveBlockAtPos(editor, pos, direction);
}

/**
 * Duplicate the block at `blockPos`.
 */
export function duplicateBlockAtPos(editor: Editor, blockPos: number): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isBlock) return false;

  const tr = state.tr;
  const insertPos = blockPos + node.nodeSize;
  tr.insert(insertPos, node);
  try {
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(Math.min(insertPos + 1, tr.doc.content.size)))
    );
  } catch {}

  view.dispatch(tr);
  return true;
}

/**
 * Duplicate the block around the current selection (Ctrl+D).
 */
export function duplicateBlock(editor: Editor): boolean {
  const pos = getBlockPosFromSelection(editor);
  if (pos === null) return false;
  return duplicateBlockAtPos(editor, pos);
}

/**
 * Delete the block at `blockPos`.
 */
export function deleteBlockAtPos(editor: Editor, blockPos: number): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isBlock) return false;

  const tr = state.tr;
  tr.delete(blockPos, blockPos + node.nodeSize);
  view.dispatch(tr);
  return true;
}

/**
 * Delete the block around the current selection.
 */
export function deleteBlock(editor: Editor): boolean {
  const pos = getBlockPosFromSelection(editor);
  if (pos === null) return false;
  return deleteBlockAtPos(editor, pos);
}

/**
 * Insert an empty paragraph directly above/below the block at `blockPos`.
 */
export function insertParagraphNear(
  editor: Editor,
  blockPos: number,
  side: 'above' | 'below'
): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isBlock) return false;
  const paraType = state.schema.nodes.paragraph;
  if (!paraType) return false;

  const insertPos = side === 'above' ? blockPos : blockPos + node.nodeSize;
  const tr = state.tr;
  const newBlock = ['listItem', 'taskItem'].includes(node.type.name)
    ? node.type.createChecked(null, [paraType.create()]) : paraType.create();
  const $insert = state.doc.resolve(insertPos);
  if (!$insert.parent.canReplaceWith($insert.index(), $insert.index(), newBlock.type)) return false;
  tr.insert(insertPos, newBlock);
  try {
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(Math.min(insertPos + 1, tr.doc.content.size)))
    );
  } catch {}

  view.dispatch(tr);
  editor.commands.focus();
  return true;
}

/**
 * Wrap the block at `blockPos` into a 2-column row (handle menu action).
 */
export function turnBlockIntoColumns(editor: Editor, blockPos: number): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isBlock) return false;
  if (['listItem', 'taskItem'].includes(node.type.name)) return convertBlock(editor, blockPos, 'columns');
  if (['columnList', 'column'].includes(node.type.name)) return false;

  const { schema } = state;
  const columnType = schema.nodes.column;
  const columnListType = schema.nodes.columnList;
  const paraType = schema.nodes.paragraph;
  if (!columnType || !columnListType || !paraType) return false;

  const rightPara = paraType.create();
  const tr = state.tr;
  tr.replaceWith(
    blockPos,
    blockPos + node.nodeSize,
    columnListType.create(
      { columns: 2 },
      [columnType.create(null, [node]), columnType.create(null, [rightPara])]
    )
  );
  view.dispatch(tr);
  return true;
}

export type DropZone = 'above' | 'below' | 'left' | 'right';

export interface BlockDropTarget {
  zone: DropZone;
  targetPos: number;
  targetNode: ProseMirrorNode;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  indicator: {
    top: number;
    left: number;
    width: number;
    height: number;
    isVertical: boolean;
  };
}

/** Width of the left/right hot zones that create or extend a column row. */
const SIDE_THRESHOLD = 0.2;

/**
 * Compute the 4-zone drop target (above, below, left, right) for block drag
 * and drop. Uses elementFromPoint and resolveDomBlockPos so every block kind
 * (text, atom, column row) resolves to a consistent position.
 *
 * Like Notion, moving into either outer edge creates a column without a
 * modifier key. Passing `sourcePos` suppresses impossible self/ancestor
 * targets so the blue guide never promises a drop that cannot happen.
 */
export function computeBlockDropTarget(
  view: EditorView,
  clientX: number,
  clientY: number,
  options?: { sourcePos?: number }
): BlockDropTarget | null {
  const editorDom = view.dom;
  if (!editorDom) return null;

  // 1. Find the element under the mouse coordinates
  let element = document.elementFromPoint(clientX, clientY);
  if (!element || !editorDom.contains(element)) {
    // Retry with X clamped into the editor (pointer hovering an overlay that
    // overlaps the editor edge, e.g. the drag handle itself).
    const editorRect = editorDom.getBoundingClientRect();
    const midX = Math.min(Math.max(clientX, editorRect.left + 20), editorRect.right - 20);
    element = document.elementFromPoint(midX, clientY);
  }
  if (!element || !editorDom.contains(element)) {
    // Outside the editor: no drop target — never invent one, otherwise the
    // indicator would promise a move that ProseMirror's drop never performs.
    return null;
  }

  // 2. Find the enclosing block element (child of .tiptap or of a column)
  const columnEl = element.closest('[data-type="column"]');
  let blockEl: HTMLElement = element as HTMLElement;

  if (columnEl && editorDom.contains(columnEl)) {
    while (blockEl && blockEl.parentElement !== columnEl && blockEl !== columnEl) {
      blockEl = blockEl.parentElement as HTMLElement;
    }
  } else {
    while (blockEl && blockEl.parentElement !== editorDom && blockEl !== editorDom) {
      blockEl = blockEl.parentElement as HTMLElement;
    }
  }

  // Pointer over the editor's own empty space (below the last block):
  // target "below the last block". The drop still lands on view.dom, so
  // ProseMirror's handleDrop will actually run for it.
  if (!blockEl || blockEl === editorDom) {
    return endOfDocDropTarget(view);
  }
  const listItem = element.closest('li');
  if (listItem && editorDom.contains(listItem)) blockEl = listItem;

  // 3. Resolve the ProseMirror block position from the DOM element
  const blockPos = resolveDomBlockPos(view, blockEl);
  if (blockPos === null) return null;
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return null;

  const sourcePos = options?.sourcePos;
  if (sourcePos !== undefined) {
    const sourceNode = view.state.doc.nodeAt(sourcePos);
    if (!sourceNode || sourcePos === blockPos) return null;
    if (
      (blockPos > sourcePos && blockPos < sourcePos + sourceNode.nodeSize) ||
      (sourcePos > blockPos && sourcePos < blockPos + node.nodeSize)
    ) return null;
  }

  const rect = blockEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  const widthRatio = rect.width > 0 ? relX / rect.width : 0.5;

  let zone: DropZone = 'below';
  if (widthRatio <= SIDE_THRESHOLD) {
    zone = 'left';
  } else if (widthRatio >= 1 - SIDE_THRESHOLD) {
    zone = 'right';
  } else {
    zone = relY < rect.height * 0.5 ? 'above' : 'below';
  }

  let indTop = rect.top;
  let indLeft = rect.left;
  let indWidth = rect.width;
  let indHeight = 3.5;
  let isVertical = false;

  if (zone === 'above') {
    indTop = rect.top - 1.75;
    indLeft = rect.left;
    indWidth = rect.width;
    indHeight = 3.5;
    isVertical = false;
  } else if (zone === 'below') {
    indTop = rect.bottom - 1.75;
    indLeft = rect.left;
    indWidth = rect.width;
    indHeight = 3.5;
    isVertical = false;
  } else if (zone === 'left' || zone === 'right') {
    if (sourcePos !== undefined) {
      const sourceType = view.state.doc.nodeAt(sourcePos)?.type.name;
      if (sourceType === 'column' || sourceType === 'columnList') return null;
    }
    isVertical = true;
    indWidth = 3.5;

    // Check if the target block is already part of a multi-column row.
    const columnListEl = blockEl.closest('[data-type="column-list"]') as HTMLElement | null;

    if (columnListEl && editorDom.contains(columnListEl)) {
      // Inside an existing row, show the guide on the actual column edge.
      // Recomputing equal future widths places the guide away from the pointer
      // and is especially wrong once column resizing is introduced.
      const rowRect = columnListEl.getBoundingClientRect();
      const allColEls = Array.from(columnListEl.children).filter(
        (el) => el.getAttribute('data-type') === 'column'
      ) as HTMLElement[];
      const currentColEl = blockEl.closest('[data-type="column"]') as HTMLElement | null;
      if (!currentColEl || !allColEls.includes(currentColEl)) return null;
      const currentColRect = currentColEl.getBoundingClientRect();
      const dividerX = zone === 'left' ? currentColRect.left : currentColRect.right;

      indTop = rowRect.top;
      indLeft = dividerX - 1.75;
      indHeight = Math.max(24, rowRect.height);
    } else {
      const rowType = view.state.schema.nodes.columnList;
      const $target = view.state.doc.resolve(blockPos);
      if (!rowType || !$target.parent.canReplaceWith($target.index(), $target.index() + 1, rowType)) {
        return null;
      }
      // For a standalone block, Notion previews the insertion at the edge
      // under the pointer. The 50/50 sizing happens only after the drop.
      indTop = rect.top;
      indLeft = (zone === 'left' ? rect.left : rect.right) - 1.75;
      indHeight = Math.max(24, rect.height);
    }
  }

  return {
    zone,
    targetPos: blockPos,
    targetNode: node,
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    indicator: {
      top: indTop,
      left: indLeft,
      width: indWidth,
      height: indHeight,
      isVertical,
    },
  };
}

function endOfDocDropTarget(view: EditorView): BlockDropTarget | null {
  const lastChild = view.state.doc.lastChild;
  if (!lastChild) return null;
  const lastDom = view.dom.lastElementChild as HTMLElement | null;
  if (!lastDom) return null;

  const lastPos = view.state.doc.content.size - lastChild.nodeSize;
  const rect = lastDom.getBoundingClientRect();
  return {
    zone: 'below',
    targetPos: lastPos,
    targetNode: lastChild,
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    indicator: {
      top: rect.bottom - 1.75,
      left: rect.left,
      width: rect.width,
      height: 3.5,
      isVertical: false,
    },
  };
}

/**
 * Move the dragged block to the computed drop target.
 *
 * Position-math rules that keep this safe:
 * - vertical moves (above/below): delete the source first, then map the
 *   insertion boundary through the deletion — the boundary is always outside
 *   the deleted range, so mapping is exact.
 * - column moves (left/right): ALWAYS delete the source first, then re-resolve
 *   the target row in the updated doc and rebuild its columns. Never delete
 *   "by mapped position" after a replaceWith — positions inside a replaced
 *   range collapse to its boundary and the delete would hit the wrong block
 *   (this was the duplicated-block / eaten-next-row corruption bug).
 */
export function moveBlockToDropTarget(
  editor: Editor,
  sourcePos: number,
  dropTarget: BlockDropTarget
): boolean {
  const { state, view } = editor;
  const { doc, schema } = state;
  const sourceNode = doc.nodeAt(sourcePos);
  if (!sourceNode || !sourceNode.isBlock) return false;

  const { zone, targetPos } = dropTarget;
  const targetNode = doc.nodeAt(targetPos);
  if (!targetNode || !targetNode.eq(dropTarget.targetNode)) return false;
  if (sourcePos === targetPos) return false;
  // A row/callout/list cannot be dropped into its own descendants (or vice versa).
  if ((targetPos > sourcePos && targetPos < sourcePos + sourceNode.nodeSize) ||
      (sourcePos > targetPos && sourcePos < targetPos + targetNode.nodeSize)) return false;

  const tr = state.tr;
  try {
    // Remove a vacated column itself so schema auto-fill does not leave a ghost column.
    const sourceParent = doc.resolve(sourcePos);
    const isListItem = ['listItem', 'taskItem'].includes(sourceNode.type.name);
    const portableNode = isListItem ? sourceParent.parent.type.createChecked(sourceParent.parent.attrs, [sourceNode]) : sourceNode;
    if (isListItem && sourceParent.parent.childCount === 1) {
      tr.delete(sourceParent.before(), sourceParent.after());
    } else if (sourceParent.parent.type.name === 'column' && sourceParent.parent.childCount === 1 && sourceParent.node(sourceParent.depth - 1).childCount > 1) {
      tr.delete(sourceParent.before(), sourceParent.after());
    } else {
      tr.delete(sourcePos, sourcePos + sourceNode.nodeSize);
    }
    const mappedTarget = tr.mapping.map(targetPos);
    const targetNow = tr.doc.nodeAt(mappedTarget);
    if (!targetNow || !targetNow.eq(targetNode)) return false;

    if (zone === 'above' || zone === 'below') {
      const insertion = zone === 'above' ? mappedTarget : mappedTarget + targetNow.nodeSize;
      const $insert = tr.doc.resolve(insertion);
      const insertNode = $insert.parent.canReplaceWith($insert.index(), $insert.index(), sourceNode.type) ? sourceNode : portableNode;
      if (!$insert.parent.canReplaceWith($insert.index(), $insert.index(), insertNode.type)) return false;
      tr.insert(insertion, insertNode);
      tr.setSelection(TextSelection.near(tr.doc.resolve(insertion + 1)));
    } else {
      const { column: columnType, columnList: rowType } = schema.nodes;
      if (!columnType || !rowType || sourceNode.type === columnType || sourceNode.type === rowType) return false;
      const newColumn = columnType.createChecked(null, [portableNode]);
      const $target = tr.doc.resolve(mappedTarget);
      let columnDepth = $target.depth;
      while (columnDepth > 0 && $target.node(columnDepth).type !== columnType) columnDepth--;
      if (columnDepth > 0) {
        const row = $target.node(columnDepth - 1);
        const rowPos = $target.before(columnDepth - 1);
        const cols: ProseMirrorNode[] = [];
        row.forEach(col => cols.push(col));
        const index = $target.index(columnDepth - 1) + (zone === 'right' ? 1 : 0);
        cols.splice(index, 0, newColumn);
        tr.replaceWith(rowPos, rowPos + row.nodeSize, rowType.createChecked({ columns: cols.length }, cols));
        let insertedPos = rowPos + 2;
        for (let i = 0; i < index; i++) insertedPos += cols[i].nodeSize;
        tr.setSelection(TextSelection.near(tr.doc.resolve(insertedPos + 1)));
      } else {
        if (targetNow.type === rowType || targetNow.type === columnType) return false;
        const targetColumn = columnType.createChecked(null, [targetNow]);
        const cols = zone === 'left' ? [newColumn, targetColumn] : [targetColumn, newColumn];
        const row = rowType.createChecked({ columns: 2 }, cols);
        if (!$target.parent.canReplaceWith($target.index(), $target.index() + 1, rowType)) return false;
        tr.replaceWith(mappedTarget, mappedTarget + targetNow.nodeSize, row);
        tr.setSelection(TextSelection.near(tr.doc.resolve(mappedTarget + 3 + (zone === 'right' ? targetColumn.nodeSize : 0))));
      }
    }
    tr.doc.check();
    view.dispatch(tr.scrollIntoView());
    return true;
  } catch {
    // No dispatch on failure: retain the exact original document and undo stack.
    return false;
  }
}
