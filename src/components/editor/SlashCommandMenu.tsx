import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { convertBlock } from './utils/block-conversion';
import { getBlockPosFromSelection } from './utils/block-movement';
import type { Editor } from '@tiptap/core';
import type { LucideIcon } from 'lucide-react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  GitGraph,
  Palette,
  Layout,
  Code2,
  Quote,
  Sparkles,
  List,
  ListOrdered,
  Minus,
} from 'lucide-react';

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  action: (editor: Editor, range?: { from: number; to: number }) => void;
}

interface SlashCommandMenuProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  query?: string;
  range?: { from: number; to: number };
}

const ITEMS: SlashItem[] = [
  {
    id: "template",
    title: '今日标准日志模版',
    description: '一键插入「今日产出、阻塞卡点、明日规划」结构化模版',
    keywords: ['moban', 'template', 'today', 'jinri', 'mb'],
    icon: Sparkles,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent([
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '🚀 今日产出与突破' }],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph' }],
            },
          ],
        },
        {
          type: 'callout',
          attrs: { type: 'blocker' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '【Blocker】' }] }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '🎯 明日规划' }],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph' }],
            },
          ],
        },
      ]).run();
    },
  },
  {
    id: "blocker",
    title: '卡点 / Blocker 高亮块',
    description: '特别标注阻塞风险与需协调事项',
    keywords: ['blocker', 'kadian', 'risk', 'warn', 'kd'],
    icon: AlertTriangle,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent({
        type: 'callout',
        attrs: { type: 'blocker' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '【Blocker】' }] }],
      }).run();
    },
  },
  {
    id: "taskList",
    title: '待办任务清单 (Todo)',
    description: '可勾选的 Task List 事项',
    keywords: ['todo', 'task', 'daiban', 'checklist', 'renwu'],
    icon: CheckSquare,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'taskList', range);
    },
  },
  {
    id: "mermaid",
    title: 'Mermaid 架构/流程图',
    description: '代码驱动的时序图、架构图与流程图',
    keywords: ['mermaid', 'flowchart', 'diagram', 'tu', 'liucheng'],
    icon: GitGraph,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent({
        type: 'mermaid',
        attrs: {
          code: 'graph TD\n  A[开始] --> B[处理]\n  B --> C[结束]',
        },
      }).run();
    },
  },
  {
    id: "whiteboard",
    title: '交互白板 / 画板 (Canvas)',
    description: '在日志中手绘架构与草图',
    keywords: ['whiteboard', 'canvas', 'draw', 'baiban', 'tldraw'],
    icon: Palette,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent({
        type: 'whiteboard',
      }).run();
    },
  },
  {
    id: "columns",
    title: '双栏并排布局 (2 Columns)',
    description: '在同一行并排显示两个 Block 块 (支持图表、卡片并列)',
    keywords: ['column', 'fenlan', '2', 'columns', 'bingpai', 'grid'],
    icon: Layout,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent({
        type: 'columnList',
        attrs: { columns: 2 },
        content: [
          {
            type: 'column',
            content: [{ type: 'paragraph' }],
          },
          {
            type: 'column',
            content: [{ type: 'paragraph' }],
          },
        ],
      }).run();
    },
  },
  {
    id: "embed",
    title: 'Figma / 网页嵌入 (Embed)',
    description: '嵌入 Figma 原型、Loom 视频或外部链接',
    keywords: ['figma', 'embed', 'video', 'link', 'qianru'],
    icon: Layout,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.insertContent({
        type: 'embed',
        attrs: { src: '', type: 'bookmark' },
      }).run();
    },
  },
  {
    id: "h1",
    title: '一级标题 (H1)',
    description: '高层级大标题',
    keywords: ['h1', 'heading1', 'biaoti1', '1'],
    icon: Heading1,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'heading1', range);
    },
  },
  {
    id: "h2",
    title: '二级标题 (H2)',
    description: '中层级小节标题',
    keywords: ['h2', 'heading2', 'biaoti2', '2'],
    icon: Heading2,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'heading2', range);
    },
  },
  {
    id: "h3",
    title: '三级标题 (H3)',
    description: '低层级子标题',
    keywords: ['h3', 'heading3', 'biaoti3', '3'],
    icon: Heading3,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'heading3', range);
    },
  },
  {
    id: "codeBlock",
    title: '代码块 (Code Block)',
    description: '保留缩进与格式的代码片段',
    keywords: ['code', 'daima', 'snippet', 'js', 'ts', 'python'],
    icon: Code2,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'codeBlock', range);
    },
  },
  {
    id: "blockquote",
    title: '引用块 (Quote)',
    description: '心得、纪要或重要引用',
    keywords: ['quote', 'yinyong', 'cite'],
    icon: Quote,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'blockquote', range);
    },
  },
  {
    id: "bulletList",
    title: '无序列表 (Bullet List)',
    description: '标准圆点项目列表',
    keywords: ['bullet', 'list', 'wuxu', 'liebiao', 'ul', '-'],
    icon: List,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'bulletList', range);
    },
  },
  {
    id: "orderedList",
    title: '有序列表 (Numbered List)',
    description: '带数字编号的项目列表',
    keywords: ['numbered', 'order', 'youxu', 'liebiao', 'ol', '1.'],
    icon: ListOrdered,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'orderedList', range);
    },
  },
  {
    id: "divider",
    title: '分割线 (Divider)',
    description: '用于区分段落的水平分割线',
    keywords: ['divider', 'hr', 'line', 'fengexian', '---'],
    icon: Minus,
    action: (editor, range) => {
      const chain = editor.chain().focus();
      if (range) chain.deleteRange(range);
      chain.setHorizontalRule().run();
    },
  },
  {
    id: "paragraph",
    title: '普通文本段落',
    description: '自由键入普通正文',
    keywords: ['text', 'paragraph', 'wenben', 'p'],
    icon: Type,
    action: (editor, range) => {
      const pos = getBlockPosFromSelection(editor);
      if (pos !== null) convertBlock(editor, pos, 'paragraph', range);
    },
  },
];

export const LOG_TEMPLATE = ITEMS.find(item => item.id === 'template')!;
const COMMAND_ORDER = ['paragraph', 'h1', 'h2', 'h3', 'taskList', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'divider', 'blocker', 'columns', 'mermaid', 'whiteboard', 'embed', 'template'];
export const SLASH_ITEMS = [...ITEMS].sort((a, b) => COMMAND_ORDER.indexOf(a.id) - COMMAND_ORDER.indexOf(b.id));

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
  isOpen,
  onClose,
  position,
  query = '',
  range,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const { height, width } = menuRef.current.getBoundingClientRect();
    setMenuPosition({ x: Math.max(8, Math.min(position.x, window.innerWidth - width - 8)), y: Math.max(8, Math.min(position.y, window.innerHeight - height - 8)) });
  }, [isOpen, position.x, position.y, query]);
  useEffect(() => {
    menuRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const cleanQuery = query.toLowerCase().trim();
  const filteredItems = SLASH_ITEMS.filter((item) => {
    if (!cleanQuery) return true;
    return (
      item.title.toLowerCase().includes(cleanQuery) ||
      item.description.toLowerCase().includes(cleanQuery) ||
      item.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery, isOpen]);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Use capture so it detects immediately
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !editor || e.isComposing || editor.view.composing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey || !editor.view.dom.contains(e.target as Node)) return;
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
      e.stopPropagation();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onClose();
          filteredItems[selectedIndex].action(editor, range);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isOpen, selectedIndex, filteredItems, editor, range, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="选择块类型"
      style={{
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'min(24rem, calc(100vh - 16px))',
      }}
      className="fixed z-50 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-75"
    >
      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>插入 Block 组件</span>
        {cleanQuery && <span className="text-emerald-500">过滤: "{cleanQuery}"</span>}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-5 text-center text-sm text-slate-400">
          未找到匹配的 Block 组件
        </div>
      ) : (
        filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                // Prevent blurring editor before executing
                e.preventDefault();
                onClose();
                if (editor) item.action(editor, range);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  isSelected
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {item.title}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
};
