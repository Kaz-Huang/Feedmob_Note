import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState } from 'react';
import { ExternalLink, Globe, Layout, Play, Settings } from 'lucide-react';

const EmbedComponent = ({ node, updateAttributes }: any) => {
  const [isEditing, setIsEditing] = useState(!node.attrs.src);
  const [url, setUrl] = useState(node.attrs.src || '');
  const [type, setType] = useState<'figma' | 'video' | 'bookmark'>(node.attrs.type || 'bookmark');

  const handleSave = () => {
    if (!url) return;
    
    // Auto-detect type
    let detectedType = type;
    if (url.includes('figma.com')) {
      detectedType = 'figma';
    } else if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4')) {
      detectedType = 'video';
    }

    setType(detectedType);
    updateAttributes({ src: url, type: detectedType });
    setIsEditing(false);
  };

  const getEmbedUrl = (rawUrl: string, embedType: string) => {
    if (embedType === 'figma') {
      return `https://www.figma.com/embed?embed_host=feedmob&url=${encodeURIComponent(rawUrl)}`;
    }
    if (embedType === 'video' && rawUrl.includes('youtube.com/watch?v=')) {
      const videoId = rawUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (embedType === 'video' && rawUrl.includes('youtu.be/')) {
      const videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return rawUrl;
  };

  return (
    <NodeViewWrapper className="my-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
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
        </div>
      ) : (
        <div className="p-2.5 bg-white dark:bg-slate-950">
          {type === 'figma' || type === 'video' ? (
            <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <iframe
                src={getEmbedUrl(url, type)}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={url}
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
