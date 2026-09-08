import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { parseEmbedUrl } from '../utils/embed-url';
import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Layout, Play, Settings } from 'lucide-react';

const EmbedComponent = ({ node, updateAttributes }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(!node.attrs.src);
  const [url, setUrl] = useState(node.attrs.src || '');
  const [type, setType] = useState<'figma' | 'video' | 'bookmark'>(node.attrs.type || 'bookmark');

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setUrl(node.attrs.src || '');
    setType(node.attrs.type || 'bookmark');
    setIsEditing(!node.attrs.src);
  }, [node.attrs.src, node.attrs.type]);
  const handleSave = () => {
    try {
      const parsed = parseEmbedUrl(url);
      setError(null);
      setUrl(parsed.src);
      setType(parsed.type);
      updateAttributes({ src: parsed.src, type: parsed.type });
      setIsEditing(false);
    } catch { setError('请输入有效的 http:// 或 https:// 链接。'); }
  };
  let preview: ReturnType<typeof parseEmbedUrl> | null = null;
  try { preview = parseEmbedUrl(node.attrs.src || ''); } catch {}

  return (
    <NodeViewWrapper contentEditable={false} className="my-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 font-semibold">
          {type === 'figma' && <Layout className="w-4 h-4 text-purple-500" />}
          {type === 'video' && <Play className="w-4 h-4 text-red-500" />}
          {type === 'bookmark' && <Globe className="w-4 h-4 text-blue-500" />}
          <span>{type === 'figma' ? 'Figma 设计稿嵌入' : type === 'video' ? '视频录像嵌入' : '智能外部书签'}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="p-4 bg-white dark:bg-slate-950 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); handleSave(); } }}
              placeholder="输入链接 (如 Figma 原型、GitHub PR、YouTube 视频或文档链接)..."
              className="flex-1 text-sm px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
            >
              确定嵌入
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="p-2.5 bg-white dark:bg-slate-950">
          {!preview ? <p role="alert" className="p-3 text-red-600">链接无效，请点击设置修改。</p> : preview.isVideoFile ? (
            <video src={preview.src} controls className="w-full max-h-80" />
          ) : preview.type === 'figma' || preview.type === 'video' ? (
            <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <iframe
                src={preview.embedUrl}
                title="嵌入内容预览"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={preview.src}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Globe className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                <div className="truncate">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600">
                    {url}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">点击在外部浏览器中打开链接</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
            </a>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};


export const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      type: { default: 'bookmark' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedComponent);
  },
});
