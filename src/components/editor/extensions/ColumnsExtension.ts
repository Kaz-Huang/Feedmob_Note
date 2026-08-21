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
        class: 'column-list-wrapper grid grid-cols-1 md:grid-cols-2 gap-4 my-4 w-full p-2 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50/40 dark:bg-slate-900/30',
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
        class: 'column-block flex-1 min-w-0 p-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition',
      }),
      0,
    ];
  },
});
