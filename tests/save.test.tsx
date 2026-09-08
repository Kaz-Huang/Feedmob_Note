import './dom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Editor } from '@tiptap/core';
import { BlockEditor } from '../src/components/editor/BlockEditor';
import { UserProvider } from '../src/lib/user-context';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async () => new Response('[]', { status: 200 });
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
async function mount(onSave: (data: any) => Promise<void>, id = 'test:2099-01-01') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(<UserProvider><BlockEditor documentId={id} date="2099-01-01" onSave={onSave} /></UserProvider>); await tick(); });
  await act(async () => { await tick(); });
  const editor = (container.querySelector('.tiptap') as any)?.editor as Editor;
  assert.ok(editor);
  const submit = () => Array.from(container.querySelectorAll('button')).find(button => /提交工作日志|正在保存/.test(button.textContent || ''))!;
  return { container, editor, submit, close: async () => { await act(async () => root.unmount()); container.remove(); } };
}

test('save in flight never replaces new text; duplicate save is blocked; latest draft restores', async () => {
  localStorage.clear();
  let resolveSave!: () => void;
  let calls = 0;
  const app = await mount(async () => { calls++; await new Promise<void>(resolve => { resolveSave = resolve; }); });
  try {
    await act(async () => { app.editor.commands.insertContent('before'); });
    await act(async () => { app.submit().click(); app.submit().click(); });
    assert.equal(calls, 1);
    await act(async () => { app.editor.commands.insertContent(' after'); });
    const selection = app.editor.state.selection.from;
    await act(async () => { resolveSave(); await tick(); });
    assert.equal(app.editor.getText(), 'before after');
    assert.equal(app.editor.state.selection.from, selection);
    assert.ok(app.container.textContent?.includes('有未提交修改'));
    assert.ok(localStorage.getItem('feedmob-draft:test:2099-01-01')?.includes('before after'));
  } finally { await app.close(); }
  const restored = await mount(async () => {});
  try { assert.equal(restored.editor.getText(), 'before after'); }
  finally { await restored.close(); localStorage.clear(); }
});

test('failed save is visible, keeps local draft, and can be retried successfully', async () => {
  localStorage.clear();
  let fail = true;
  const app = await mount(async () => { if (fail) throw new Error('模拟保存失败'); });
  try {
    await act(async () => { app.editor.commands.insertContent('must survive'); });
    await act(async () => { app.submit().click(); await tick(); });
    assert.match(app.container.querySelector('[role="alert"]')?.textContent ?? '', /模拟保存失败/);
    assert.equal(app.editor.getText(), 'must survive');
    assert.ok(localStorage.getItem('feedmob-draft:test:2099-01-01'));
    fail = false;
    await act(async () => { app.submit().click(); await tick(); });
    assert.equal(app.container.querySelector('[role="alert"]'), null);
    assert.ok(app.container.textContent?.includes('成功保存'));
    assert.equal(localStorage.getItem('feedmob-draft:test:2099-01-01'), null);
  } finally { await app.close(); localStorage.clear(); }
});

test('IME Enter stays in the editor; plain Enter chooses a slash command without splitting a block', async () => {
  localStorage.clear();
  const app = await mount(async () => {});
  try {
    await act(async () => { app.editor.commands.insertContent('/h2'); });
    assert.ok(app.container.querySelector('[role="listbox"]'));
    await act(async () => {
      app.editor.view.dom.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    });
    assert.equal(app.editor.getText(), '/h2');
    await act(async () => {
      app.editor.view.dom.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    assert.equal(app.editor.state.doc.childCount, 1);
    assert.equal(app.editor.state.doc.firstChild?.type.name, 'heading');
    assert.equal(app.editor.state.doc.firstChild?.attrs.level, 2);
    assert.equal(app.editor.getText(), '');
  } finally { await app.close(); localStorage.clear(); }
});

test('selection toolbar applies formatting to selected text without adding a block', async () => {
  localStorage.clear();
  const app = await mount(async () => {});
  try {
    await act(async () => {
      app.editor.commands.insertContent('format me');
      app.editor.chain().focus().setTextSelection({ from: 1, to: 7 }).run();
      await tick();
    });
    const bold = document.querySelector<HTMLButtonElement>('[role="toolbar"] button[aria-label="加粗"]');
    assert.ok(bold);
    await act(async () => {
      bold.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      bold.click();
    });
    assert.equal(app.editor.state.doc.childCount, 1);
    assert.equal(app.editor.state.doc.firstChild?.firstChild?.marks[0]?.type.name, 'bold');
    assert.equal(app.editor.getText(), 'format me');
  } finally { await app.close(); localStorage.clear(); }
});
