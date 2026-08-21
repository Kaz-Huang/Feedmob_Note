import React, { useEffect, useState, useRef } from 'react';
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
} from 'lucide-react';

export interface SlashItem {
  title: string;
  description: string;
  keywords: string[];
  icon: any;
  action: (editor: any, range?: { from: number; to: number }) => void;
}

interface SlashCommandMenuProps {
  editor: any;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  query?: string;
  range?: { from: number; to: number };
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: '今日标准日志模版',
    description: '一键插入「今日产出、阻塞卡点、明日规划」结构化模版',
    keywords: ['moban', 'template', 'today', 'jinri', 'mb'],
    icon: Sparkles,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent([
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
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '重点任务 1：' }] }],
            },
          ],
        },
        {
          type: 'callout',
          attrs: { type: 'blocker' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '【Blocker】如有卡点请在此说明，若无请删除本块' }] }],
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
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '计划任务 1：' }] }],
            },
          ],
        },
      ]).run();
    },
  },
  {
    title: '卡点 / Blocker 高亮块',
    description: '特别标注阻塞风险与需协调事项',
    keywords: ['blocker', 'kadian', 'risk', 'warn', 'kd'],
    icon: AlertTriangle,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: 'callout',
        attrs: { type: 'blocker' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '【Blocker】' }] }],
      }).run();
    },
  },
  {
    title: '待办任务清单 (Todo)',
    description: '可勾选的 Task List 事项',
    keywords: ['todo', 'task', 'daiban', 'checklist', 'renwu'],
    icon: CheckSquare,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    title: 'Mermaid 架构/流程图',
    description: '代码驱动的时序图、架构图与流程图',
    keywords: ['mermaid', 'flowchart', 'diagram', 'tu', 'liucheng'],
    icon: GitGraph,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: 'mermaid',
        attrs: {
          code: 'graph TD\n  A[Feedmob 研发] --> B(Block 编辑器)\n  B --> C[完成交付]',
        },
      }).run();
    },
  },
  {
    title: '交互白板 / 画板 (Canvas)',
    description: '在日志中手绘架构与草图',
    keywords: ['whiteboard', 'canvas', 'draw', 'baiban', 'tldraw'],
    icon: Palette,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: 'whiteboard',
      }).run();
    },
  },
  {
    title: '双栏并排布局 (2 Columns)',
    description: '在同一行并排显示两个 Block 块 (支持图表、卡片并列)',
    keywords: ['column', 'fenlan', '2', 'columns', 'bingpai', 'grid'],
    icon: Layout,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: 'columnList',
        attrs: { columns: 2 },
        content: [
          {
            type: 'column',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '👈 左栏内容 (输入 / 插入图表或组件)' }] }],
          },
          {
            type: 'column',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '👉 右栏内容 (同行并排显示)' }] }],
          },
        ],
      }).run();
    },
  },
  {
    title: 'Figma / 网页嵌入 (Embed)',
    description: '嵌入 Figma 原型、Loom 视频或外部链接',
    keywords: ['figma', 'embed', 'video', 'link', 'qianru'],
    icon: Layout,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: 'embed',
        attrs: { src: '', type: 'bookmark' },
      }).run();
    },
  },
  {
    title: '一级标题 (H1)',
    description: '高层级大标题',
    keywords: ['h1', 'heading1', 'biaoti1', '1'],
    icon: Heading1,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: '二级标题 (H2)',
    description: '中层级小节标题',
    keywords: ['h2', 'heading2', 'biaoti2', '2'],
    icon: Heading2,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: '三级标题 (H3)',
    description: '低层级子标题',
    keywords: ['h3', 'heading3', 'biaoti3', '3'],
    icon: Heading3,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: '代码块 (Code Block)',
    description: '代码高亮片段',
    keywords: ['code', 'daima', 'snippet', 'js', 'ts', 'python'],
    icon: Code2,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: '引用块 (Quote)',
    description: '心得、纪要或重要引用',
    keywords: ['quote', 'yinyong', 'cite'],
    icon: Quote,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: '普通文本段落',
    description: '自由键入普通正文',
    keywords: ['text', 'paragraph', 'wenben', 'p'],
    icon: Type,
    action: (editor, range) => {
      if (range) editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().setParagraph().run();
    },
  },
];

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
  }, [cleanQuery]);

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
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action(editor, range);
          onClose();
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
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-75"
    >
      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>插入 Block 组件</span>
        {cleanQuery && <span className="text-emerald-500">过滤: "{cleanQuery}"</span>}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400">
          未找到匹配的 Block 组件
        </div>
      ) : (
        filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={item.title}
              type="button"
              onMouseDown={(e) => {
                // Prevent blurring editor before executing
                e.preventDefault();
                item.action(editor, range);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition text-xs ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-md mt-0.5 ${
                  isSelected
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
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
