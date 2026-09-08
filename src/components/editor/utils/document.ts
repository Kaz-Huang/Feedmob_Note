import type { JSONContent } from '@tiptap/core';

export const EMPTY_DOCUMENT: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export function parseDocument(value: unknown): JSONContent {
  if (!value) return EMPTY_DOCUMENT;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || (parsed as JSONContent).type !== 'doc') {
    throw new Error('日志内容格式无效，未打开编辑器以避免覆盖原文。');
  }
  const clean = (node: JSONContent): JSONContent => ({
    ...node,
    ...(node.content ? { content: node.content.filter(child => child.type !== 'text' || !!child.text).map(clean) } : {}),
  });
  return clean(parsed as JSONContent);
}

export interface DocumentSnapshot {
  title: string;
  contentJson: JSONContent;
  tagNames: string[];
  mood: string;
}

export function snapshotKey(snapshot: DocumentSnapshot): string { return JSON.stringify(snapshot); }
