import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import { ChevronRight } from 'lucide-react';
import React from 'react';

/** The title is document content, so formatting, undo and copy work normally. */
function ToggleView({ node, editor, getPos }: NodeViewProps) {
  const collapsed = Boolean(node.attrs.collapsed);
  const toggle = () => {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, collapsed: !collapsed });
    // A caret in the body must not remain in an invisible paragraph.
    const bodyStart = pos + 1 + (node.firstChild?.nodeSize ?? 0);
    if (!collapsed && [editor.state.selection.anchor, editor.state.selection.head].some(caret => caret >= bodyStart && caret < pos + node.nodeSize)) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 2)));
    }
    editor.view.dispatch(tr);
  };

  return (
    <NodeViewWrapper className={`toggle-block${collapsed ? ' is-collapsed' : ''}`} data-type="toggle" data-collapsed={String(collapsed)}>
      <div className="toggle-control" contentEditable={false}>
        <button type="button" aria-label={collapsed ? '展开折叠块' : '收起折叠块'} aria-expanded={!collapsed}
          className="toggle-disclosure" onClick={toggle} onMouseDown={event => event.preventDefault()}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <NodeViewContent className="toggle-content" />
    </NodeViewWrapper>
  );
}

/** Enter in a hidden title opens the body before placing the new caret there. */
export function enterCollapsedToggle(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!(selection instanceof TextSelection)) return false;
  const { $from, $to } = selection;
  if (!$from.sameParent($to) || $from.parent.type.name !== 'paragraph' || $from.depth < 2) return false;
  const depth = $from.depth - 1;
  const toggle = $from.node(depth);
  if (toggle.type.name !== 'toggle' || !toggle.attrs.collapsed || $from.index(depth) !== 0) return false;
  return editor.chain().command(({ tr }) => {
    tr.setNodeMarkup($from.before(depth), undefined, { ...toggle.attrs, collapsed: false });
    return true;
  }).splitBlock().run();
}

export const ToggleNode = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'paragraph block*',
  defining: true,
  draggable: true,
  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
        renderHTML: attributes => ({ 'data-collapsed': String(Boolean(attributes.collapsed)) }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-type="toggle"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle', class: 'toggle-block' }), 0];
  },
  addExtensions() {
    // Keyboard precedence must not change schema order: paragraph needs to
    // remain the default block for divider insertion and schema auto-fill.
    return [Extension.create({
      name: 'toggleKeyboard',
      priority: 1101,
      addKeyboardShortcuts() {
        return { Enter: () => enterCollapsedToggle(this.editor) };
      },
    })];
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      // Keyboard navigation, search results and programmatic focus can all
      // enter the hidden body. Expand its ancestors while keeping the caret.
      appendTransaction(transactions, _oldState, state) {
        if (!transactions.some(tr => tr.selectionSet)) return null;
        const positions = new Set<number>();
        for (const $pos of [state.selection.$from, state.selection.$to]) {
          for (let depth = 1; depth <= $pos.depth; depth++) {
            const node = $pos.node(depth);
            if (node.type.name !== 'toggle' || !node.attrs.collapsed) continue;
            const pos = $pos.before(depth);
            const bodyStart = pos + 1 + (node.firstChild?.nodeSize ?? 0);
            if ($pos.pos >= bodyStart) positions.add(pos);
          }
        }
        if (!positions.size) return null;
        const tr = state.tr;
        for (const pos of positions) {
          const node = tr.doc.nodeAt(pos)!;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, collapsed: false });
        }
        return tr;
      },
    })];
  },
  addNodeView() { return ReactNodeViewRenderer(ToggleView); },
});
