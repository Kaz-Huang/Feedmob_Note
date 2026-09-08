import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './dom';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Column, ColumnList } from '../src/components/editor/extensions/ColumnsExtension';
import { CalloutNode } from '../src/components/editor/extensions/CalloutNode';
import { MermaidNode } from '../src/components/editor/extensions/MermaidNode';
import { EmbedNode } from '../src/components/editor/extensions/EmbedNode';
import { WhiteboardNode } from '../src/components/editor/extensions/WhiteboardNode';
import { SlashCommand, slashCommandKey } from '../src/components/editor/extensions/SlashCommand';
import { SLASH_ITEMS } from '../src/components/editor/SlashCommandMenu';
import { computeBlockDropTarget, duplicateBlock, moveBlock, moveBlockToDropTarget, resolveDomBlockPos, turnBlockIntoColumns, type BlockDropTarget } from '../src/components/editor/utils/block-movement';
import { startBlockDrag, getDraggedBlockPos } from '../src/components/editor/utils/block-drag';
import { parseDocument } from '../src/components/editor/utils/document';
import { BLOCK_TYPES, convertBlock } from '../src/components/editor/utils/block-conversion';
import { parseEmbedUrl } from '../src/components/editor/utils/embed-url';


const editors: Editor[] = [];
const p = (text = '') => ({ type: 'paragraph', ...(text ? { content: [{ type: 'text', text }] } : {}) });
function make(content: any[] = [p()]) {
  const editor = new Editor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), ColumnList, Column, CalloutNode, MermaidNode, WhiteboardNode, EmbedNode, SlashCommand],
    content: { type: 'doc', content },
  });
  editors.push(editor);
  return editor;
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); });
function posOf(editor: Editor, text: string) {
  let result = -1;
  editor.state.doc.descendants((node, pos) => { if (node.isTextblock && node.textContent === text) result = pos; });
  assert.ok(result >= 0, text);
  return result;
}
function drop(editor: Editor, source: number, target: number, zone: BlockDropTarget['zone']) {
  return moveBlockToDropTarget(editor, source, { zone, targetPos: target, targetNode: editor.state.doc.nodeAt(target)! } as BlockDropTarget);
}

test('all slash commands produce valid nodes and remove only the query', () => {
  for (const item of SLASH_ITEMS) {
    const editor = make([p('/'), p('保留的内容')]);
    editor.commands.setTextSelection(2);
    item.action(editor, { from: 1, to: 2 });
    assert.doesNotThrow(() => editor.state.doc.check(), item.title);
    assert.ok(editor.getText().includes('保留的内容'), item.title);
    assert.ok(!editor.getText().includes('/'), item.title);
    assert.equal(editor.commands.undo(), true, item.title);
    assert.equal(editor.getText(), '/\n\n保留的内容', item.title + ' can undo the entire command');
  }
});

test('slash state follows committed Chinese input, deletion, cursor movement and Escape', () => {
  const editor = make();
  editor.commands.insertContent('/');
  assert.equal(slashCommandKey.getState(editor.state)?.match?.query, '');
  editor.commands.insertContent('标题');
  assert.equal(slashCommandKey.getState(editor.state)?.match?.query, '标题');
  editor.view.dispatch(editor.state.tr.setMeta(slashCommandKey, 'close'));
  editor.commands.insertContent('一');
  assert.equal(slashCommandKey.getState(editor.state)?.match, null);
  editor.commands.setContent({ type: 'doc', content: [p('https://example.com')] });
  editor.commands.setTextSelection(20);
  assert.equal(slashCommandKey.getState(editor.state)?.match, null);
  editor.commands.setContent({ type: 'doc', content: [p('/abc'), p('second')] });
  editor.commands.setTextSelection(5);
  editor.commands.insertContent('d');
  assert.equal(slashCommandKey.getState(editor.state)?.match?.query, 'abcd');
  editor.commands.setTextSelection(2);
  assert.equal(slashCommandKey.getState(editor.state)?.match, null);
});

test('duplicate and move a task preserve checkbox, nested children and sibling order', () => {
  const task = (text: string, checked: boolean) => ({ type: 'taskItem', attrs: { checked }, content: [p(text)] });
  const editor = make([{ type: 'taskList', content: [task('one', true), task('two', false)] }]);
  editor.commands.setTextSelection(posOf(editor, 'one') + 2);
  assert.equal(duplicateBlock(editor), true);
  let list = editor.state.doc.firstChild!;
  assert.equal(list.childCount, 3);
  assert.equal(list.child(1).attrs.checked, true);
  assert.equal(list.child(1).childCount, 1);
  editor.commands.setTextSelection(posOf(editor, 'two') + 2);
  assert.equal(moveBlock(editor, 'up'), true);
  list = editor.state.doc.firstChild!;
  assert.deepEqual(Array.from({ length: list.childCount }, (_, i) => list.child(i).textContent), ['one', 'two', 'one']);
  editor.state.doc.check();
});

test('DOM and keyboard agree on task item positions', () => {
  const editor = make([{ type: 'taskList', content: [{ type: 'taskItem', content: [p('task')] }] }]);
  const li = editor.view.dom.querySelector('li')!;
  assert.equal(resolveDomBlockPos(editor.view, li), 1);
});

test('drop zones create columns without a modifier and draw the guide at the real edge', () => {
  const editor = make([p('source'), p('target')]);
  const blocks = editor.view.dom.querySelectorAll('p');
  const targetBlock = blocks[1] as HTMLElement;
  targetBlock.getBoundingClientRect = () => ({
    top: 200, bottom: 240, left: 100, right: 1100, width: 1000, height: 40,
    x: 100, y: 200, toJSON: () => ({}),
  });

  const previousElementFromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => targetBlock });
  try {
    const sourcePos = posOf(editor, 'source');
    const targetPos = posOf(editor, 'target');
    const left = computeBlockDropTarget(editor.view, 110, 220, { sourcePos });
    const right = computeBlockDropTarget(editor.view, 1090, 220, { sourcePos });
    const above = computeBlockDropTarget(editor.view, 600, 205, { sourcePos });

    assert.equal(left?.zone, 'left');
    assert.equal(left?.indicator.isVertical, true);
    assert.equal(left?.indicator.left, 98.25);
    assert.equal(right?.zone, 'right');
    assert.equal(right?.indicator.left, 1098.25);
    assert.equal(above?.zone, 'above');
    assert.equal(above?.indicator.isVertical, false);
    assert.equal(computeBlockDropTarget(editor.view, 600, 220, { sourcePos: targetPos }), null);
  } finally {
    if (previousElementFromPoint) Object.defineProperty(document, 'elementFromPoint', previousElementFromPoint);
    else delete (document as any).elementFromPoint;
  }
});

test('column drop guide follows the current column edge instead of an estimated future width', () => {
  const editor = make([{ type: 'columnList', content: [
    { type: 'column', content: [p('A')] },
    { type: 'column', content: [p('B')] },
  ] }]);
  const row = editor.view.dom.querySelector('[data-type="column-list"]') as HTMLElement;
  const columns = row.querySelectorAll(':scope > [data-type="column"]');
  const targetColumn = columns[1] as HTMLElement;
  const targetBlock = targetColumn.querySelector('p') as HTMLElement;
  row.getBoundingClientRect = () => ({ top: 100, bottom: 260, left: 100, right: 1100, width: 1000, height: 160, x: 100, y: 100, toJSON: () => ({}) });
  targetColumn.getBoundingClientRect = () => ({ top: 100, bottom: 260, left: 680, right: 1100, width: 420, height: 160, x: 680, y: 100, toJSON: () => ({}) });
  targetBlock.getBoundingClientRect = () => ({ top: 120, bottom: 160, left: 680, right: 1100, width: 420, height: 40, x: 680, y: 120, toJSON: () => ({}) });

  const previousElementFromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => targetBlock });
  try {
    const result = computeBlockDropTarget(editor.view, 1090, 140, { sourcePos: posOf(editor, 'A') });
    assert.equal(result?.zone, 'right');
    assert.equal(result?.indicator.left, 1098.25);
    assert.equal(result?.indicator.top, 100);
    assert.equal(result?.indicator.height, 160);
  } finally {
    if (previousElementFromPoint) Object.defineProperty(document, 'elementFromPoint', previousElementFromPoint);
    else delete (document as any).elementFromPoint;
  }
});

test('side guide is hidden when the schema cannot accept a column row', () => {
  const editor = make([{ type: 'bulletList', content: [
    { type: 'listItem', content: [p('A')] },
    { type: 'listItem', content: [p('B')] },
  ] }]);
  const target = editor.view.dom.querySelectorAll('li')[1] as HTMLElement;
  target.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 100, right: 700, width: 600, height: 40, x: 100, y: 100, toJSON: () => ({}) });
  const previousElementFromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => target });
  try {
    assert.equal(computeBlockDropTarget(editor.view, 690, 120, { sourcePos: posOf(editor, 'A') - 1 }), null);
  } finally {
    if (previousElementFromPoint) Object.defineProperty(document, 'elementFromPoint', previousElementFromPoint);
    else delete (document as any).elementFromPoint;
  }
});

test('moving text preserves the caret offset and supports undo', () => {
  const editor = make([p('hello'), p('world')]);
  editor.commands.setTextSelection(4);
  moveBlock(editor, 'down');
  assert.equal(editor.state.selection.from, 11);
  assert.equal(editor.getText(), 'world\n\nhello');
  editor.commands.undo();
  assert.equal(editor.getText(), 'hello\n\nworld');
});

test('moving the only block out of a column removes the vacated column without losing content', () => {
  const editor = make([{ type: 'columnList', content: [{ type: 'column', content: [p('A')] }, { type: 'column', content: [p('B')] }] }, p('C')]);
  assert.equal(drop(editor, posOf(editor, 'A'), posOf(editor, 'C'), 'below'), true);
  assert.deepEqual(editor.getJSON().content?.map(n => n.type), ['paragraph', 'paragraph', 'paragraph']);
  assert.equal(editor.getText(), 'B\n\nC\n\nA');
  editor.state.doc.check();
  editor.commands.undo();
  assert.equal(editor.state.doc.firstChild?.type.name, 'columnList');
});

test('side drop inside a row reorders columns without leaving an empty column', () => {
  const editor = make([{ type: 'columnList', content: [{ type: 'column', content: [p('A')] }, { type: 'column', content: [p('B')] }] }]);
  assert.equal(drop(editor, posOf(editor, 'A'), posOf(editor, 'B'), 'right'), true);
  const row = editor.state.doc.firstChild!;
  assert.equal(row.childCount, 2);
  assert.equal(row.child(0).textContent, 'B');
  assert.equal(row.child(1).textContent, 'A');
});

test('reject dropping containers into their children without modifying the document', () => {
  const editor = make([{ type: 'callout', content: [p('child')] }, p('outside')]);
  const before = editor.getJSON();
  assert.equal(drop(editor, 0, posOf(editor, 'child'), 'right'), false);
  assert.deepEqual(editor.getJSON(), before);
});

test('drag state belongs to one editor and becomes invalid after edits', () => {
  const first = make([p('a')]), second = make([p('b')]);
  startBlockDrag(first.view, 0);
  assert.equal(getDraggedBlockPos(first.view), 0);
  assert.equal(getDraggedBlockPos(second.view), null);
  first.commands.insertContent('changed');
  assert.equal(getDraggedBlockPos(first.view), null);
});

test('converting to columns creates editable empty space instead of sample text', () => {
  const editor = make([p('keep')]);
  assert.equal(turnBlockIntoColumns(editor, 0), true);
  assert.equal(editor.state.doc.firstChild?.child(1).textContent, '');
  assert.equal(editor.state.doc.firstChild?.childCount, 2);
  const tasks = make([{ type: 'taskList', content: [
    { type: 'taskItem', content: [p('before')] },
    { type: 'taskItem', attrs: { checked: true }, content: [p('selected'), { type: 'bulletList', content: [{ type: 'listItem', content: [p('nested')] }] }] },
    { type: 'taskItem', content: [p('after')] },
  ] }]);
  const original = tasks.getJSON();
  assert.equal(turnBlockIntoColumns(tasks, posOf(tasks, 'selected') - 1), true);
  assert.deepEqual(tasks.getJSON().content?.map(node => node.type), ['taskList', 'columnList', 'taskList']);
  assert.equal(tasks.state.doc.child(1).child(0).child(0).child(0).attrs.checked, true);
  assert.ok(tasks.getText().includes('nested'));
  tasks.commands.undo();
  assert.deepEqual(tasks.getJSON(), original);
});

test('legacy empty text nodes are repaired; invalid documents are rejected', () => {
  assert.deepEqual(parseDocument(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] })), { type: 'doc', content: [{ type: 'paragraph', content: [] }] });
  assert.throws(() => parseDocument('{broken'));
  assert.throws(() => parseDocument({ type: 'not-a-document' }));
});

test('type conversion preserves neighbouring list items and nested children for every target', () => {
  for (const [type] of BLOCK_TYPES) {
    const editor = make([{ type: 'bulletList', content: [
      { type: 'listItem', content: [p('before')] },
      { type: 'listItem', content: [p('convert'), { type: 'bulletList', content: [{ type: 'listItem', content: [p('nested')] }] }] },
      { type: 'listItem', content: [p('after')] },
    ] }]);
    const before = editor.getJSON();
    assert.equal(convertBlock(editor, posOf(editor, 'convert') - 1, type), true, type);
    editor.state.doc.check();
    for (const text of ['before', 'convert', 'nested', 'after']) assert.ok(editor.getText().includes(text), type + ': ' + text);
    assert.equal(editor.commands.undo(), true);
    assert.deepEqual(editor.getJSON(), before, type + ' undo');
  }
});

test('list items drag within lists and out into standalone lists without losing checkbox state', () => {
  const editor = make([{ type: 'taskList', content: [
    { type: 'taskItem', attrs: { checked: true }, content: [p('A')] },
    { type: 'taskItem', attrs: { checked: false }, content: [p('B')] },
  ] }, p('C')]);
  assert.equal(drop(editor, posOf(editor, 'A') - 1, posOf(editor, 'B') - 1, 'below'), true);
  assert.equal(editor.state.doc.firstChild?.child(1).attrs.checked, true);
  assert.equal(drop(editor, posOf(editor, 'A') - 1, posOf(editor, 'C'), 'below'), true);
  assert.equal(editor.state.doc.lastChild?.firstChild?.attrs.checked, true);
  editor.state.doc.check();
});

test('embed URLs validate protocols and hosts and normalize supported providers', () => {
  assert.throws(() => parseEmbedUrl('javascript:alert(1)'));
  assert.throws(() => parseEmbedUrl('not a url'));
  assert.equal(parseEmbedUrl('https://evil.test/?q=figma.com').type, 'bookmark');
  assert.equal(parseEmbedUrl('https://figma.com.evil.test/').type, 'bookmark');
  assert.equal(parseEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=3').embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(parseEmbedUrl('https://www.loom.com/share/abc123').embedUrl, 'https://www.loom.com/embed/abc123');
  assert.equal(parseEmbedUrl('https://example.test/video.mp4?token=sample').isVideoFile, true);
});

test('slash heading inside a task converts only that item and undoes in one step', () => {
  const editor = make([{ type: 'taskList', content: [
    { type: 'taskItem', content: [p('before')] },
    { type: 'taskItem', content: [p('/h2')] },
    { type: 'taskItem', content: [p('after')] },
  ] }]);
  const original = editor.getJSON();
  const from = posOf(editor, '/h2') + 1;
  editor.commands.setTextSelection(from + 3);
  SLASH_ITEMS.find(item => item.id === 'h2')!.action(editor, { from, to: from + 3 });
  assert.deepEqual(editor.getJSON().content?.map(node => node.type), ['taskList', 'heading', 'taskList']);
  assert.equal(editor.state.doc.child(1).attrs.level, 2);
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), original);
});
