import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

export const ColumnList = Node.create({
  name: 'columnList',
  group: 'block',
  content: 'column{1,}',
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      columns: {
        default: 2,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column-list"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column-list',
        class: 'column-list-wrapper flex flex-row items-start gap-4 my-1.5 w-full',
      }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('columnListAutoCleanup'),
        appendTransaction(transactions, oldState, newState) {
          // If document didn't change, do nothing
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const { doc, schema } = newState;
          const columnListType = schema.nodes.columnList;
          if (!columnListType) return null;

          let tr: any = null;

          doc.descendants((node, pos) => {
            if (node.type === columnListType) {
              let nonEmptyCols = 0;
              const childBlocks: ProseMirrorNode[] = [];

              node.forEach((col) => {
                let colHasContent = false;
                col.forEach((block) => {
                  childBlocks.push(block);
                  colHasContent = true;
                });
                if (colHasContent) {
                  nonEmptyCols++;
                }
              });

              // If degenerate (<= 1 column with content), auto-unwrap into top-level blocks
              if (nonEmptyCols <= 1 || node.childCount <= 1) {
                if (!tr) tr = newState.tr;
                const mappedPos = tr.mapping.map(pos);
                if (childBlocks.length === 0) {
                  tr.replaceWith(
                    mappedPos,
                    mappedPos + node.nodeSize,
                    schema.nodes.paragraph.create()
                  );
                } else {
                  tr.replaceWith(mappedPos, mappedPos + node.nodeSize, childBlocks);
                }
              }
              return false; // Do not descend into inner columns
            }
            return true;
          });

          return tr;
        },
      }),
    ];
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        class: 'column-block flex-1 min-w-0',
      }),
      0,
    ];
  },
});
