import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './dom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { NodeSelection, Selection } from '@tiptap/pm/state';
import { BlockSelection, BlockRangeSelection, handleBlockSelectionKeyDown, selectBlockAt, selectedBlockRange, duplicateSelectedBlocks, deleteSelectedBlocks } from '../src/components/editor/extensions/BlockSelection';
import { ToggleNode } from '../src/components/editor/extensions/ToggleNode';
import { SlashCommand, slashCommandKey } from '../src/components/editor/extensions/SlashCommand';
import { Column, ColumnList } from '../src/components/editor/extensions/ColumnsExtension';
import { CalloutNode } from '../src/components/editor/extensions/CalloutNode';

const editors: Editor[] = [];
const p = (text = '') => ({ type: 'paragraph', ...(text ? { content: [{ type: 'text', text }] } : {}) });
const item = (text: string, checked = false, children: any[] = []) => ({ type: 'taskItem', attrs: { checked }, content: [p(text), ...children] });
function make(content: any[] = [p()]) {
  const editor = new Editor({ extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), ToggleNode, SlashCommand, BlockSelection, Column, ColumnList, CalloutNode], content: { type: 'doc', content } });
  editors.push(editor);
  return editor;
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });
function key(editor: Editor, name: string, options: KeyboardEventInit = {}) {
  const event = new window.KeyboardEvent('keydown', { key: name, cancelable: true, ...options });
  return handleBlockSelectionKeyDown(editor, event);
}
function posOf(editor: Editor, text: string) {
  let result = -1;
  editor.state.doc.descendants((node, pos) => { if (node.isTextblock && node.textContent === text) result = pos; });
  assert.ok(result >= 0);
  return result;
}

test('Escape selects one whole block; shift arrows expand, shrink and keep direction', () => {
  const editor = make([p('one'), p('two'), p('three')]);
  editor.commands.setTextSelection(posOf(editor, 'two') + 2);
  assert.equal(key(editor, 'Escape'), true);
  assert.ok(editor.state.selection instanceof NodeSelection);
  assert.equal(editor.view.dom.querySelectorAll('.block-selected').length, 1);
  assert.equal(key(editor, 'ArrowUp', { shiftKey: true }), true);
  assert.ok(editor.state.selection instanceof BlockRangeSelection);
  assert.equal(selectedBlockRange(editor.state)?.positions.length, 2);
  assert.equal(editor.view.dom.querySelectorAll('.block-selected').length, 2);
  key(editor, 'ArrowDown', { shiftKey: true });
  assert.ok(editor.state.selection instanceof NodeSelection);
  key(editor, 'ArrowDown', { shiftKey: true });
  assert.equal(editor.state.selection.content().content.textBetween(0, editor.state.selection.content().content.size, '|'), 'two|three');
  key(editor, 'Escape');
  assert.ok(!selectedBlockRange(editor.state));
  assert.equal(editor.state.selection.$from.parent.textContent, 'two');
});

test('duplicate selected task siblings preserves checked state and nested children, and undoes once', () => {
  const nested = { type: 'taskList', content: [item('nested', true)] };
  const editor = make([{ type: 'taskList', content: [item('one', true, [nested]), item('two'), item('three')] }]);
  editor.commands.setTextSelection(posOf(editor, 'one') + 2);
  key(editor, 'Escape');
  key(editor, 'ArrowDown', { shiftKey: true });
  const before = editor.getJSON();
  assert.equal(key(editor, 'd', { metaKey: true }), true);
  const list = editor.state.doc.firstChild!;
  assert.deepEqual(Array.from({ length: list.childCount }, (_, i) => list.child(i).firstChild!.textContent), ['one', 'two', 'one', 'two', 'three']);
  assert.equal(list.child(2).attrs.checked, true);
  assert.equal(list.child(2).child(1).firstChild!.attrs.checked, true);
  assert.equal(selectedBlockRange(editor.state)?.positions.length, 2);
  assert.doesNotThrow(() => editor.state.doc.check());
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
});

test('delete all selected list items removes their list, preserves neighbors and undo restores it', () => {
  const editor = make([p('before'), { type: 'taskList', content: [item('one'), item('two', true)] }, p('after')]);
  editor.commands.setTextSelection(posOf(editor, 'one') + 1);
  key(editor, 'Escape');
  key(editor, 'ArrowDown', { shiftKey: true });
  const before = editor.getJSON();
  assert.equal(key(editor, 'Backspace'), true);
  assert.deepEqual(editor.getJSON().content?.map(node => node.type), ['paragraph', 'paragraph']);
  assert.equal(editor.getText(), 'before\n\nafter');
  assert.doesNotThrow(() => editor.state.doc.check());
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
});

test('nested selection stays among its own siblings and never expands into a parent task', () => {
  const editor = make([{ type: 'taskList', content: [item('parent', false, [{ type: 'taskList', content: [item('inner one'), item('inner two')] }]), item('outer sibling')] }]);
  editor.commands.setTextSelection(posOf(editor, 'inner one') + 1);
  key(editor, 'Escape');
  key(editor, 'ArrowDown', { shiftKey: true });
  key(editor, 'ArrowDown', { shiftKey: true });
  assert.equal(selectedBlockRange(editor.state)?.parent.type.name, 'taskList');
  assert.equal(selectedBlockRange(editor.state)?.positions.length, 2);
  deleteSelectedBlocks(editor);
  assert.equal(editor.state.doc.firstChild!.childCount, 2);
  assert.equal(editor.state.doc.firstChild!.firstChild!.childCount, 1);
  assert.equal(editor.state.doc.firstChild!.firstChild!.textContent, 'parent');
  assert.equal(editor.state.doc.firstChild!.lastChild!.textContent, 'outer sibling');
  editor.state.doc.check();
});

test('deleting a whole document keeps an editable paragraph and deleting a whole column unwraps its sibling', () => {
  const editor = make([p('one'), p('two')]);
  selectBlockAt(editor, 0);
  key(editor, 'ArrowDown', { shiftKey: true });
  deleteSelectedBlocks(editor);
  assert.equal(editor.state.doc.childCount, 1);
  assert.equal(editor.state.doc.firstChild!.type.name, 'paragraph');
  editor.state.doc.check();
  const columns = make([{ type: 'columnList', content: [{ type: 'column', content: [p('left')] }, { type: 'column', content: [p('right')] }] }]);
  selectBlockAt(columns, posOf(columns, 'left'));
  deleteSelectedBlocks(columns);
  assert.equal(columns.state.doc.childCount, 1);
  assert.equal(columns.state.doc.firstChild!.type.name, 'paragraph');
  assert.equal(columns.state.doc.firstChild!.textContent, 'right');
  columns.state.doc.check();
});

test('Delete and Backspace remove a selected empty column and undo restores its exact layout', () => {
  for (const name of ['Delete', 'Backspace']) {
    const editor = make([{ type: 'columnList', content: [
      { type: 'column', content: [p('keep left')] }, { type: 'column', content: [p()] },
    ] }, p('after')]);
    const before = editor.getJSON();
    selectBlockAt(editor, posOf(editor, ''));
    assert.equal(key(editor, name), true);
    assert.deepEqual(editor.getJSON().content, [p('keep left'), p('after')]);
    editor.state.doc.check();
    editor.commands.undo();
    assert.deepEqual(editor.getJSON(), before);
  }
});

test('deleting all selected blocks in a column removes its layout without touching its neighbor', () => {
  const editor = make([{ type: 'columnList', content: [
    { type: 'column', content: [p('left one'), p('left two')] },
    { type: 'column', content: [p('right one'), p('right two')] },
  ] }]);
  const before = editor.getJSON();
  editor.view.dispatch(editor.state.tr.setSelection(new BlockRangeSelection(editor.state.doc, posOf(editor, 'right one'), posOf(editor, 'right two'))));
  assert.equal(deleteSelectedBlocks(editor), true);
  assert.deepEqual(editor.getJSON().content, [p('left one'), p('left two')]);
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
});

test('selection maps through document edits, serializes and releases when an endpoint is deleted', () => {
  const editor = make([p('one'), p('two'), p('three')]);
  const two = posOf(editor, 'two'), three = posOf(editor, 'three');
  editor.view.dispatch(editor.state.tr.setSelection(new BlockRangeSelection(editor.state.doc, two, three)));
  editor.view.dispatch(editor.state.tr.insert(0, editor.schema.nodes.paragraph.create(null, editor.schema.text('before'))));
  const range = selectedBlockRange(editor.state)!;
  assert.equal(editor.state.doc.nodeAt(range.anchor)!.textContent, 'two');
  assert.equal(editor.state.doc.nodeAt(range.head)!.textContent, 'three');
  const roundtrip = Selection.fromJSON(editor.state.doc, editor.state.selection.toJSON());
  assert.ok(roundtrip.eq(editor.state.selection));
  const bookmark = editor.state.selection.getBookmark();
  assert.ok(bookmark.resolve(editor.state.doc).eq(editor.state.selection));
  editor.view.dispatch(editor.state.tr.delete(range.head, range.to));
  assert.equal(selectedBlockRange(editor.state), null);
  editor.state.doc.check();
});

test('IME and form fields keep their shortcuts; slash Escape belongs to slash menu', () => {
  const editor = make();
  assert.equal(key(editor, 'Escape', { isComposing: true }), false);
  editor.commands.insertContent('/');
  assert.ok(slashCommandKey.getState(editor.state)?.match);
  assert.equal(key(editor, 'Escape'), false);
  const input = document.createElement('input');
  editor.view.dom.appendChild(input);
  let handled = true;
  input.addEventListener('keydown', event => { handled = handleBlockSelectionKeyDown(editor, event); });
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: false }));
  assert.equal(handled, false);
});

test('toggle JSON and HTML retain editable rich title, nested content and collapse state', () => {
  const editor = make([{ type: 'toggle', attrs: { collapsed: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Title', marks: [{ type: 'bold' }] }] }, { type: 'taskList', content: [item('inside', true)] }] }]);
  assert.equal(editor.state.doc.firstChild!.attrs.collapsed, true);
  assert.equal(editor.state.doc.firstChild!.firstChild!.firstChild!.marks[0].type.name, 'bold');
  assert.match(editor.getHTML(), /data-collapsed="true"/);
  const copy = make();
  copy.commands.setContent(editor.getHTML());
  assert.deepEqual(copy.getJSON(), editor.getJSON());
  assert.equal(duplicateSelectedBlocks(editor), false);
  editor.commands.setTextSelection(posOf(editor, 'Title') + 2);
  editor.commands.insertContent('new');
  assert.match(editor.state.doc.firstChild!.firstChild!.textContent, /new/);
  editor.commands.undo();
  assert.equal(editor.state.doc.firstChild!.firstChild!.textContent, 'Title');
  editor.state.doc.check();
});

test('Enter in a collapsed toggle title expands and splits once, with atomic undo', () => {
  const editor = make([{ type: 'toggle', attrs: { collapsed: true }, content: [p('title'), p('existing body')] }, p('outside')]);
  editor.commands.setTextSelection(posOf(editor, 'title') + 3);
  const before = editor.getJSON();
  const event = new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
  const handled = editor.view.someProp('handleKeyDown', handler => handler(editor.view, event));
  assert.equal(handled, true);
  const toggle = editor.state.doc.firstChild!;
  assert.equal(toggle.attrs.collapsed, false);
  assert.deepEqual(Array.from({ length: toggle.childCount }, (_, i) => toggle.child(i).textContent), ['ti', 'tle', 'existing body']);
  assert.equal(editor.state.selection.$from.parent.textContent, 'tle');
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
  assert.equal(editor.state.selection.$from.parent.textContent, 'title');
});

test('navigation into nested collapsed bodies expands ancestors and preserves exact selection', () => {
  const editor = make([{ type: 'toggle', attrs: { collapsed: true }, content: [p('outer title'), { type: 'toggle', attrs: { collapsed: true }, content: [p('inner title'), p('hidden body')] }] }]);
  const caret = posOf(editor, 'hidden body') + 4;
  editor.commands.setTextSelection(caret);
  assert.equal(editor.state.selection.from, caret);
  assert.equal(editor.state.doc.firstChild!.attrs.collapsed, false);
  assert.equal(editor.state.doc.firstChild!.child(1).attrs.collapsed, false);
  assert.doesNotThrow(() => editor.state.doc.check());
});

test('Escape and Enter on an atom block return gracefully to a neighboring text block', () => {
  const editor = make([p('before'), { type: 'horizontalRule' }, p('after')]);
  selectBlockAt(editor, editor.state.doc.firstChild!.nodeSize);
  key(editor, 'Enter');
  assert.equal(selectedBlockRange(editor.state), null);
  assert.equal(editor.state.selection.$from.parent.textContent, 'after');
});

test('selecting a hidden body node expands its toggle without changing the NodeSelection', () => {
  const editor = make([{ type: 'toggle', attrs: { collapsed: true }, content: [p('title'), { type: 'horizontalRule' }] }, p('after')]);
  const bodyPos = 1 + editor.state.doc.firstChild!.firstChild!.nodeSize;
  selectBlockAt(editor, bodyPos);
  assert.equal(editor.state.doc.firstChild!.attrs.collapsed, false);
  assert.ok(editor.state.selection instanceof NodeSelection);
  assert.equal(editor.state.selection.from, bodyPos);
  assert.equal(editor.state.selection.node.type.name, 'horizontalRule');
});

test('Alt arrows move selected blocks as one group, preserve reverse anchor direction and undo each move', () => {
  const editor = make([p('one'), p('two'), p('three'), p('four')]);
  editor.view.dispatch(editor.state.tr.setSelection(new BlockRangeSelection(editor.state.doc, posOf(editor, 'three'), posOf(editor, 'two'))));
  const before = editor.getJSON();
  assert.equal(key(editor, 'ArrowUp', { altKey: true }), true);
  assert.deepEqual(editor.getJSON().content?.map(node => node.content?.[0]?.text), ['two', 'three', 'one', 'four']);
  let range = selectedBlockRange(editor.state)!;
  assert.equal(editor.state.doc.nodeAt(range.anchor)!.textContent, 'three');
  assert.equal(editor.state.doc.nodeAt(range.head)!.textContent, 'two');
  assert.equal(range.positions.length, 2);
  assert.equal(key(editor, 'ArrowUp', { altKey: true }), true);
  assert.equal(selectedBlockRange(editor.state)?.from, 0);
  assert.deepEqual(editor.getJSON().content?.map(node => node.content?.[0]?.text), ['two', 'three', 'one', 'four']);
  key(editor, 'ArrowDown', { altKey: true });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.undo();
  assert.deepEqual(editor.getJSON().content?.map(node => node.content?.[0]?.text), ['two', 'three', 'one', 'four']);
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
  editor.state.doc.check();
});

test('moving selected task siblings preserves checked attrs, nested children and list boundaries', () => {
  const nested = { type: 'taskList', content: [item('nested', true)] };
  const editor = make([{ type: 'taskList', content: [item('one', true, [nested]), item('two'), item('three', true)] }]);
  editor.commands.setTextSelection(posOf(editor, 'one') + 2);
  key(editor, 'Escape');
  key(editor, 'ArrowDown', { shiftKey: true });
  const before = editor.getJSON();
  key(editor, 'ArrowDown', { altKey: true });
  const list = editor.state.doc.firstChild!;
  assert.deepEqual(Array.from({ length: list.childCount }, (_, i) => list.child(i).firstChild!.textContent), ['three', 'one', 'two']);
  assert.equal(list.child(1).attrs.checked, true);
  assert.equal(list.child(1).child(1).firstChild!.attrs.checked, true);
  key(editor, 'ArrowDown', { altKey: true });
  assert.equal(editor.state.doc.firstChild!.childCount, 3);
  assert.equal(editor.state.doc.childCount, 1);
  editor.state.doc.check();
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
});

test('Escape from a toggle title selects its full toggle and body rather than its first paragraph', () => {
  const editor = make([{ type: 'toggle', attrs: { collapsed: true }, content: [p('title'), p('body')] }, p('after')]);
  editor.commands.setTextSelection(posOf(editor, 'title') + 2);
  key(editor, 'Escape');
  assert.ok(editor.state.selection instanceof NodeSelection);
  assert.equal(editor.state.selection.node.type.name, 'toggle');
  assert.equal(editor.state.selection.node.childCount, 2);
  assert.equal(editor.state.selection.node.attrs.collapsed, true);
  key(editor, 'Escape');
  assert.equal(editor.state.selection.$from.parent.textContent, 'title');
});
