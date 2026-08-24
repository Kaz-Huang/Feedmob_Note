import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useRef, useState } from 'react';
import { Code2, Eye, GitGraph } from 'lucide-react';

const MermaidComponent = ({ node, updateAttributes }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(
    node.attrs.code ||
      'graph TD\n  A[开始] --> B[处理]\n  B --> C[结束]'
  );
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (typeof window === 'undefined') return;

      try {
        setError(null);
        const mermaidModule = (await import('mermaid')).default;
        mermaidModule.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
        });

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaidModule.render(uniqueId, code);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.warn('Mermaid render warning:', err);
        if (isMounted) {
          setError(err?.message || 'Mermaid 语法解析中...');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    updateAttributes({ code: newCode });
  };

  return (
    <NodeViewWrapper className="my-4 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 font-semibold">
          <GitGraph className="w-4 h-4 text-indigo-500" />
          <span>Mermaid 架构/时序图表</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isEditing
                ? 'bg-white dark:bg-slate-700 text-indigo-600 font-bold shadow-xs'
                : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            {isEditing ? '预览图表' : '编辑源码'}
          </button>
        </div>
      </div>

      {/* Body */}
      {isEditing ? (
        <div className="p-4">
          <textarea
            value={code}
            onChange={handleCodeChange}
            rows={5}
            placeholder="输入 Mermaid 语法，如 graph TD ..."
            className="w-full font-mono text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-3 rounded-lg border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
          />
        </div>
      ) : (
        <div
          ref={containerRef}
          className="p-5 flex flex-col items-center justify-center bg-white dark:bg-slate-950 min-h-[140px] overflow-x-auto"
        >
          {error ? (
            <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200">
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
        default:
          'graph TD\n  A[开始] --> B[处理]\n  B --> C[结束]',
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

