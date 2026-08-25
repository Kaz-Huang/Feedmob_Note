import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnList = Node.create({
  name: 'columnList',
  group: 'block',
  content: 'column{2,}',
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
        class: 'column-list-wrapper flex flex-row items-start gap-4 my-1 w-full',
      }),
      0,
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
