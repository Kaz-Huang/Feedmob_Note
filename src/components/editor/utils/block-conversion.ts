import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

export const BLOCK_TYPES = [
  ['paragraph', '文本'], ['heading1', '一级标题'], ['heading2', '二级标题'], ['heading3', '三级标题'],
  ['bulletList', '无序列表'], ['orderedList', '有序列表'], ['taskList', '待办清单'], ['blockquote', '引用'], ['callout', '提示块'], ['codeBlock', '代码块'],
] as const;
export type BlockType = typeof BLOCK_TYPES[number][0] | 'columns';

export function canConvertBlock(editor: Editor, pos: number): boolean {
  const node = editor.state.doc.nodeAt(pos);
  return !!node && (node.isTextblock || ['listItem', 'taskItem'].includes(node.type.name));
}

// Convert only the selected item, keeping neighbouring list items and all
// nested children. No text round-trip: inline marks survive conversion.
export function convertBlock(editor: Editor, pos: number, type: BlockType, range?: { from: number; to: number }): boolean {
  if (!canConvertBlock(editor, pos)) return false;
  const { state, view } = editor;
  const { schema } = state;
  const tr = state.tr;
  if (range) tr.delete(range.from, range.to);
  const node = tr.doc.nodeAt(pos)!;
  const item = ['listItem', 'taskItem'].includes(node.type.name);
  const textBlock = item ? node.firstChild! : node;
  const paragraph = schema.nodes.paragraph.create(null, textBlock.content);
  const trailing = item ? Array.from({ length: node.childCount - 1 }, (_, i) => node.child(i + 1)) : [];
  try {
    let converted;
    let siblings = trailing;
    if (type === 'columns') {
      const source = item ? tr.doc.resolve(pos).parent.type.createChecked(tr.doc.resolve(pos).parent.attrs, [node]) : node;
      converted = schema.nodes.columnList.createChecked({ columns: 2 }, [
        schema.nodes.column.createChecked(null, [source]),
        schema.nodes.column.createChecked(null, [schema.nodes.paragraph.create()]),
      ]);
      siblings = [];
    } else if (type.startsWith('heading')) converted = schema.nodes.heading.createChecked({ level: Number(type.slice(-1)) }, textBlock.content);
    else if (type === 'paragraph') converted = paragraph;
    else if (type === 'codeBlock') converted = schema.nodes.codeBlock.createChecked(null, textBlock.textContent ? schema.text(textBlock.textContent) : null);
    else if (['bulletList', 'orderedList', 'taskList'].includes(type)) {
      const itemType = schema.nodes[type === 'taskList' ? 'taskItem' : 'listItem'];
      converted = schema.nodes[type].createChecked(null, [itemType.createChecked(type === 'taskList' ? { checked: node.attrs.checked ?? false } : null, [paragraph, ...trailing])]);
      siblings = [];
    } else {
      converted = schema.nodes[type].createChecked(type === 'callout' ? { type: 'tip' } : null, [paragraph, ...trailing]);
      siblings = [];
    }
    let selectionPos = pos + 1;
    if (item) {
      const $pos = tr.doc.resolve(pos);
      const list = $pos.parent;
      const listPos = $pos.before();
      const index = $pos.index();
      const before = [], after = [];
      for (let i = 0; i < list.childCount; i++) {
        if (i < index) before.push(list.child(i));
        if (i > index) after.push(list.child(i));
      }
      const prefix = before.length ? [list.type.createChecked(list.attrs, before)] : [];
      const suffixAttrs = list.type.name === 'orderedList' ? { ...list.attrs, start: (list.attrs.start ?? 1) + index + 1 } : list.attrs;
      const suffix = after.length ? [list.type.createChecked(suffixAttrs, after)] : [];
      tr.replaceWith(listPos, listPos + list.nodeSize, [...prefix, converted, ...siblings, ...suffix]);
      selectionPos = listPos + (prefix[0]?.nodeSize ?? 0) + 1;
    } else tr.replaceWith(pos, pos + node.nodeSize, [converted, ...siblings]);
    tr.doc.check();
    tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos)));
    view.dispatch(tr);
    editor.commands.focus();
    return true;
  } catch { return false; }
}
