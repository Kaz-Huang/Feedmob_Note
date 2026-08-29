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
      if (n.isBlock && !COLUMN_TYPES.has(n.type.name)) {
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
  const insertBoundary =
    direction === 'up'
      ? siblingPos
      : siblingPos + parent.child(targetIndex).nodeSize;

  // The parent keeps other children (we only move at non-edge indices), so
  // the deletion never empties the parent and position mapping stays simple.
  const tr = state.tr;
  tr.delete(blockPos, blockPos + node.nodeSize);
  const safeInsert = Math.max(0, Math.min(tr.mapping.map(insertBoundary), tr.doc.content.size));
  tr.insert(safeInsert, node);

  try {
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(Math.min(safeInsert + 1, tr.doc.content.size)))
    );
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
  tr.insert(insertPos, paraType.create());
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
  if (node.type.name === 'columnList' || node.type.name === 'column') return false;

  const { schema } = state;
  const columnType = schema.nodes.column;
  const columnListType = schema.nodes.columnList;
  const paraType = schema.nodes.paragraph;
  if (!columnType || !columnListType || !paraType) return false;

  const rightPara = paraType.create(null, [state.schema.text('👉 并排右栏内容...')]);
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

/** Vertical line threshold at the left/right edge of a block. */
const SIDE_THRESHOLD = 0.2;

/**
 * Compute the 4-zone drop target (above, below, left, right) for block drag
 * and drop. Uses elementFromPoint and resolveDomBlockPos so every block kind
 * (text, atom, column row) resolves to a consistent position.
 *
 * Side zones (column creation) are opt-in via `allowSides` — pass the drag
 * event's shiftKey so reordering stays a plain vertical drag and column
 * splits require an explicit ⇧+drag gesture.
 */
export function computeBlockDropTarget(
  view: EditorView,
  clientX: number,
  clientY: number,
  options?: { allowSides?: boolean }
): BlockDropTarget | null {
  const allowSides = options?.allowSides ?? true;
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

  // 3. Resolve the ProseMirror block position from the DOM element
  const blockPos = resolveDomBlockPos(view, blockEl);
  if (blockPos === null) return null;
  const node = view.state.doc.nodeAt(blockPos);
  if (!node) return null;

  const rect = blockEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  const widthRatio = rect.width > 0 ? relX / rect.width : 0.5;

  let zone: DropZone = 'below';
  if (allowSides && widthRatio <= SIDE_THRESHOLD) {
    zone = 'left';
  } else if (allowSides && widthRatio >= 1 - SIDE_THRESHOLD) {
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
    isVertical = true;
    indWidth = 3.5;

    // Check if the target block is already part of a multi-column row
    const columnListEl = blockEl.closest('[data-type="column-list"]') as HTMLElement | null;

    if (columnListEl && editorDom.contains(columnListEl)) {
      // Case A: inside an existing columnList (N columns -> N + 1 columns)
      const rowRect = columnListEl.getBoundingClientRect();
      const allColEls = Array.from(columnListEl.children).filter(
        (el) => el.getAttribute('data-type') === 'column'
      ) as HTMLElement[];
      const currentNumCols = Math.max(1, allColEls.length);
      const nextNumCols = currentNumCols + 1;
      const colWidth = rowRect.width / nextNumCols;

      const currentColEl = blockEl.closest('[data-type="column"]') as HTMLElement | null;
      const currentColIndex = currentColEl ? Math.max(0, allColEls.indexOf(currentColEl)) : 0;

      let dividerX: number;
      if (zone === 'left') {
        dividerX = rowRect.left + (currentColIndex === 0 ? colWidth : currentColIndex * colWidth);
      } else {
        dividerX = rowRect.left + (currentColIndex + 1) * colWidth;
      }

      indTop = rowRect.top;
      indLeft = dividerX - 1.75;
      indHeight = Math.max(24, blockEl.getBoundingClientRect().height, rowRect.height);
    } else {
      // Case B: standalone single block row (1 column -> 2 columns, 50%/50%)
      indTop = rect.top;
      indLeft = rect.left + rect.width * 0.5 - 1.75;
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

  const { zone, targetPos, targetNode } = dropTarget;

  // Cannot drop a block onto itself
  if (sourcePos === targetPos) {
    return true;
  }

  // Never build columns out of empty paragraphs — invisible half-empty rows
  // are exactly the "stray marker next to a block" artifact; degrade to a
  // vertical move instead.
  let effZone = zone;
  if (
    (zone === 'left' || zone === 'right') &&
    (isEmptyParagraph(sourceNode) || isEmptyParagraph(targetNode))
  ) {
    effZone = 'below';
  }

  const tr = state.tr;

  if (effZone === 'above' || effZone === 'below') {
    // 1. Standard vertical reordering using exact position mapping
    const insertBoundary =
      effZone === 'above' ? targetPos : targetPos + targetNode.nodeSize;

    if (
      insertBoundary === sourcePos ||
      insertBoundary === sourcePos + sourceNode.nodeSize
    ) {
      return true; // already at this position
    }

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

  if (effZone === 'left' || effZone === 'right') {
    // 2. Side-by-side column creation / insertion
    const columnType = schema.nodes.column;
    const columnListType = schema.nodes.columnList;
    if (!columnType || !columnListType) return false;

    const createCol = (node: ProseMirrorNode) =>
      node.type === columnType ? node : columnType.create(null, [node]);

    // Is the target already inside a column row?
    const $target = doc.resolve(targetPos);
    let inColumnRow = false;
    for (let d = $target.depth; d >= 1; d--) {
      if ($target.node(d).type === columnListType) {
        inColumnRow = true;
        break;
      }
    }

    // Phase 1: remove the source FIRST. Everything afterwards resolves in the
    // updated doc, so it works no matter where the source lived — including
    // inside the same row as the target.
    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize);

    // Defensive fallback: if anything below fails, put the source back so a
    // failed drop never silently loses content.
    const restoreSource = () => {
      const back = Math.max(0, Math.min(tr.mapping.map(sourcePos, -1), tr.doc.content.size));
      tr.insert(back, sourceNode);
    };

    if (inColumnRow) {
      // Phase 2: re-resolve the target inside the (possibly shrunken) row.
      const mappedTarget = tr.mapping.map(targetPos, 1);
      if (mappedTarget >= 0 && mappedTarget <= tr.doc.content.size) {
        const $t = tr.doc.resolve(mappedTarget);
        for (let d = $t.depth; d >= 2; d--) {
          if (
            $t.node(d).type === columnType &&
            $t.node(d - 1).type === columnListType
          ) {
            const listNode = $t.node(d - 1);
            const listPos = $t.before(d - 1);
            const colIndex = $t.index(d - 1);

            const cols: ProseMirrorNode[] = [];
            listNode.forEach((c) => {
              // Drop columns that were emptied by the source deletion.
              if (c.childCount > 0) cols.push(c);
            });

            const insertIndex =
              effZone === 'left'
                ? Math.max(0, Math.min(colIndex, cols.length))
                : Math.min(cols.length, colIndex + 1);
            cols.splice(insertIndex, 0, createCol(sourceNode));

            const newList = columnListType.create({ columns: cols.length }, cols);
            tr.replaceWith(listPos, listPos + listNode.nodeSize, newList);

            let newColPos = listPos + 1;
            for (let i = 0; i < insertIndex; i++) newColPos += cols[i].nodeSize;
            try {
              tr.setSelection(TextSelection.near(tr.doc.resolve(newColPos + 2)));
            } catch {}

            view.dispatch(tr);
            return true;
          }
        }
      }
      restoreSource();
      view.dispatch(tr);
      return true;
    }

    // Case B: standalone target — wrap [target, source] into a fresh 2-col row
    const clampedTarget = Math.max(0, Math.min(tr.mapping.map(targetPos, 1), tr.doc.content.size));
    const targetNodeNow = tr.doc.nodeAt(clampedTarget);
    if (targetNodeNow && targetNodeNow.isBlock && targetNodeNow.type.name !== 'columnList') {
      const col1 = createCol(effZone === 'left' ? sourceNode : targetNodeNow);
      const col2 = createCol(effZone === 'left' ? targetNodeNow : sourceNode);
      const newList = columnListType.create({ columns: 2 }, [col1, col2]);
      tr.replaceWith(clampedTarget, clampedTarget + targetNodeNow.nodeSize, newList);

      let srcColPos = clampedTarget + 1;
      if (effZone === 'right') srcColPos += col1.nodeSize;
      try {
        tr.setSelection(TextSelection.near(tr.doc.resolve(srcColPos + 2)));
      } catch {}
    } else {
      restoreSource();
    }

    view.dispatch(tr);
    return true;
  }

  return false;
}
