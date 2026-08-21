import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useRef, useState } from 'react';
import { Code2, Eye, GitGraph, RefreshCw } from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
});

const MermaidComponent = ({ node, updateAttributes }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(node.attrs.code || 'graph TD\n  A[Feedmob 研发] --> B(Block 编辑器)\n  B --> C{多维投影}\n  C -->|时序流| D[Team Feed]\n  C -->|标签透视| E[Tag Matrix]');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  const renderDiagram = async (currentCode: string) => {
    try {
      setError(null);
      const { svg: renderedSvg } = await mermaid.render(renderId.current, currentCode);
      setSvg(renderedSvg);
    } catch (err: any) {
      console.error('Mermaid render error', err);
      setError(err?.message || 'Mermaid 语法解析失败');
    }
  };

  useEffect(() => {
    renderDiagram(code);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    updateAttributes({ code: newCode });
  };

  return (
    <NodeViewWrapper className="my-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 font-medium">
          <GitGraph className="w-3.5 h-3.5 text-indigo-500" />
          <span>Mermaid 架构/时序图表</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              isEditing ? 'bg-white dark:bg-slate-700 text-indigo-600 font-semibold shadow-xs' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isEditing ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
            {isEditing ? '预览图表' : '编辑源码'}
          </button>
        </div>
      </div>

      {/* Body */}
      {isEditing ? (
        <div className="p-3">
          <textarea
            value={code}
            onChange={handleCodeChange}
            rows={5}
            placeholder="输入 Mermaid 语法，如 graph TD ..."
            className="w-full font-mono text-xs bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-2.5 rounded border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center bg-white dark:bg-slate-950 min-h-[120px] overflow-x-auto">
          {error ? (
            <div className="text-red-500 text-xs p-2 bg-red-50 dark:bg-red-950/40 rounded border border-red-200">
              {error}
            </div>
          ) : (
            <div
              className="mermaid-output flex justify-center max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const MermaidNode = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A[Feedmob 研发] --> B(Block 编辑器)\n  B --> C{多维投影}\n  C -->|时序流| D[Team Feed]\n  C -->|标签透视| E[Tag Matrix]',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },
});
