import { Editor } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
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
 * Finds the block containing the current selection.
 * Supports top-level blocks as well as inner blocks inside columns.
 */
export function getClosestBlockRange(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  if ($from.depth < 1) return null;

  // Search from current depth up to depth 1
  let depth = $from.depth;
  while (depth > 1 && $from.node(depth).isBlock === false) {
    depth--;
  }

  // If node at this depth is columnList or column and has inner block, prefer inner block
  const node = $from.node(depth);
  const start = $from.start(depth);
  const end = $from.end(depth);
  const index = $from.index(Math.max(0, depth - 1));

  return {
    node,
    pos: $from.before(depth),
    start,
    end,
    nodeSize: node.nodeSize,
    index,
    depth,
  };
}

export const getTopLevelBlockRange = getClosestBlockRange;

/**
 * Checks if the given position (or current selection) is inside a columnList.
 */
export function getEnclosingColumnList(editor: Editor, fromPos?: number) {
  const { state } = editor;
  const pos = fromPos ?? state.selection.from;
  if (pos < 0 || pos > state.doc.content.size) return null;

  try {
    const $pos = state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) {
      const node = $pos.node(d);
      if (node.type.name === 'columnList') {
        return {
          node,
          pos: $pos.before(d),
          nodeSize: node.nodeSize,
        };
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
 * Move current top-level block UP or DOWN safely with position mapping.
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

  // Calculate target position in document before deletion
  let targetPos = 0;
  for (let i = 0; i < targetIndex; i++) {
    targetPos += doc.child(i).nodeSize;
  }

  const insertBoundary = direction === 'up'
    ? targetPos
    : targetPos + doc.child(targetIndex).nodeSize;

  // Extract the node to move
  const nodeToMove = block.node;
  const deleteFrom = block.pos;
  const deleteTo = block.pos + block.nodeSize;

  // Execute transaction: delete source first, then map insertion boundary
  tr.delete(deleteFrom, deleteTo);
  const mappedInsert = tr.mapping.map(insertBoundary);
  const safeInsert = Math.max(0, Math.min(mappedInsert, tr.doc.content.size));

  tr.insert(safeInsert, nodeToMove);

  // Preserve selection inside the moved node
  const newSelectionPos = Math.min(safeInsert + 1, tr.doc.content.size);
  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(newSelectionPos)));
  } catch {}

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

/**
 * Compute the 4-zone drop target (above, below, left, right) for block drag and drop.
 * Uses elementFromPoint and posAtDOM to guarantee reliable DOM and position resolution.
 */
export function computeBlockDropTarget(
  view: EditorView,
  clientX: number,
  clientY: number
): BlockDropTarget | null {
  const editorDom = view.dom;
  if (!editorDom) return null;

  // 1. Find the element under mouse coordinates
  let element = document.elementFromPoint(clientX, clientY);
  if (!element || !editorDom.contains(element)) {
    const editorRect = editorDom.getBoundingClientRect();
    const midX = Math.min(Math.max(clientX, editorRect.left + 20), editorRect.right - 20);
    element = document.elementFromPoint(midX, clientY);
  }

  if (!element || !editorDom.contains(element)) {
    const lastChild = view.state.doc.lastChild;
    if (lastChild) {
      const lastPos = view.state.doc.content.size - lastChild.nodeSize;
      const lastDom = view.dom.lastElementChild as HTMLElement | null;
      if (lastDom) {
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
    }
    return null;
  }

  // 2. Find the enclosing block element (either child of .tiptap or child of [data-type="column"])
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

  if (!blockEl || blockEl === editorDom) {
    return null;
  }

  // 3. Resolve the ProseMirror block position from the DOM element
  let blockPos = 0;
  try {
    const pos = view.posAtDOM(blockEl, 0);
    if (pos < 0) return null;
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) {
      const n = $pos.node(d);
      if (n.isBlock && n.type.name !== 'column' && n.type.name !== 'columnList') {
        blockPos = $pos.before(d);
        break;
      }
    }
    if (blockPos === 0 && $pos.depth >= 1) {
      blockPos = $pos.before(1);
    }
  } catch {
    return null;
  }

  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return null;

  const rect = blockEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  const widthRatio = rect.width > 0 ? relX / rect.width : 0.5;

  let zone: DropZone = 'below';
  const SIDE_THRESHOLD = 0.15;

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
  } else if (zone === 'left') {
    indTop = rect.top;
    indLeft = rect.left - 2;
    indWidth = 3.5;
    indHeight = Math.max(24, rect.height);
    isVertical = true;
  } else if (zone === 'right') {
    indTop = rect.top;
    indLeft = rect.right - 1.5;
    indWidth = 3.5;
    indHeight = Math.max(24, rect.height);
    isVertical = true;
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

/**
 * Move block to target, handling both vertical reordering (above/below) and
 * side-by-side multi-column wrapping (left/right).
 */
export function moveBlockToDropTarget(
  editor: Editor,
  sourcePos: number,
  dropTarget: BlockDropTarget
): boolean {
  const { state, view } = editor;
  const { doc, schema } = state;
  const sourceNode = doc.nodeAt(sourcePos);
  if (!sourceNode || sourceNode.isBlock === false) return false;

  const { zone, targetPos, targetNode } = dropTarget;

  // Cannot drop a block onto itself
  if (sourcePos === targetPos) {
    return true;
  }

  const tr = state.tr;

  if (zone === 'above' || zone === 'below') {
    // 1. Standard vertical reordering using safe position mapping
    const insertBoundary = zone === 'above' ? targetPos : targetPos + targetNode.nodeSize;

    if (insertBoundary === sourcePos || insertBoundary === sourcePos + sourceNode.nodeSize) {
      return true; // Already at position
    }

    // Delete source first, map insertion target, insert sourceNode
    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize);
    const mappedInsert = tr.mapping.map(insertBoundary);
    const safeInsert = Math.max(0, Math.min(mappedInsert, tr.doc.content.size));
    tr.insert(safeInsert, sourceNode);

    const selPos = Math.min(safeInsert + 1, tr.doc.content.size);
    try {
      tr.setSelection(TextSelection.near(tr.doc.resolve(selPos)));
    } catch {}

    view.dispatch(tr);
    return true;
  }

  if (zone === 'left' || zone === 'right') {
    // 2. Side-by-Side Column Creation / Wrapping
    const columnType = schema.nodes.column;
    const columnListType = schema.nodes.columnList;

    if (!columnType || !columnListType) return false;

    // Helper: Wrap a node into column content.
    const createCol = (node: ProseMirrorNode) => {
      if (node.type === columnType) {
        return node;
      }
      return columnType.create(null, [node]);
    };

    let newColumnList: ProseMirrorNode;

    if (targetNode.type === columnListType) {
      // Target is already a ColumnList: append a new column on left or right
      const existingCols: ProseMirrorNode[] = [];
      targetNode.forEach((col) => existingCols.push(col));

      const newCol = createCol(sourceNode);
      const cols = zone === 'left' ? [newCol, ...existingCols] : [...existingCols, newCol];
      newColumnList = columnListType.create({ columns: cols.length }, cols);
    } else {
      // Target is regular block: create a 2-column list
      const col1 = createCol(zone === 'left' ? sourceNode : targetNode);
      const col2 = createCol(zone === 'left' ? targetNode : sourceNode);
      newColumnList = columnListType.create({ columns: 2 }, [col1, col2]);
    }

    if (sourcePos < targetPos) {
      // 1. Delete source first
      const sourceSize = sourceNode.nodeSize;
      tr.delete(sourcePos, sourcePos + sourceSize);
      // 2. Map targetPos after deletion
      const mappedTargetPos = tr.mapping.map(targetPos);
      const targetSize = targetNode.nodeSize;
      tr.replaceWith(mappedTargetPos, mappedTargetPos + targetSize, newColumnList);
    } else {
      // 1. Replace target first
      const targetSize = targetNode.nodeSize;
      tr.replaceWith(targetPos, targetPos + targetSize, newColumnList);
      // 2. Map sourcePos after replacement
      const mappedSourcePos = tr.mapping.map(sourcePos);
      const sourceSize = sourceNode.nodeSize;
      tr.delete(mappedSourcePos, mappedSourcePos + sourceSize);
    }

    view.dispatch(tr);
    editor.commands.focus();
    return true;
  }

  return false;
}
