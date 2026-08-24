import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';

const CalloutComponent = ({ node, updateAttributes }: any) => {
  const type = node.attrs.type || 'blocker';

  const typeConfig: Record<string, { icon: any; bg: string; border: string; text: string; label: string }> = {
    blocker: {
      icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      label: '卡点 / Blocker',
    },
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      label: '提示 / Tip',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      label: '信息 / Info',
    },
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: '产出 / Goal',
    },
  };

  const current = typeConfig[type] || typeConfig.blocker;
  const Icon = current.icon;

  return (
    <NodeViewWrapper className={`my-4 p-4 rounded-xl border flex gap-3.5 transition-colors ${current.bg} ${current.border}`}>
      <div className="flex flex-col items-center select-none pt-0.5 shrink-0">
        <Icon className={`w-5 h-5 ${current.text}`} />
        <select
          value={type}
          onChange={(e) => updateAttributes({ type: e.target.value })}
          className="mt-1 text-xs bg-transparent border-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer outline-none font-medium"
        >
          <option value="blocker">⚠️ 卡点</option>
          <option value="tip">💡 提示</option>
          <option value="info">ℹ️ 信息</option>
          <option value="success">🎯 目标</option>
        </select>
      </div>
      <div className="flex-1 min-w-0 text-base leading-relaxed">
        <NodeViewContent className="outline-none text-slate-800 dark:text-slate-200" />
      </div>
    </NodeViewWrapper>
  );
};


export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'blocker',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
