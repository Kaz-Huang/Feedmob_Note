'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';

import { CalloutNode } from './extensions/CalloutNode';
import { MermaidNode } from './extensions/MermaidNode';
import { WhiteboardNode } from './extensions/WhiteboardNode';
import { EmbedNode } from './extensions/EmbedNode';
import { ColumnList, Column } from './extensions/ColumnsExtension';
import { SlashCommandMenu, SLASH_ITEMS } from './SlashCommandMenu';
import { BlockDragHandle } from './BlockDragHandle';
import { moveBlock, duplicateBlock } from './utils/block-movement';
import {
  computeBlockDropTarget,
  moveBlockToPosition,
  BLOCK_DRAG_MIME,
} from './utils/block-movement';
import { useCurrentUser } from '@/lib/user-context';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Check,
  Save,
  Sparkles,
  Smile,
  AlertTriangle,
  Plus,
  X,
  Keyboard,
  ArrowUpDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';


interface BlockEditorProps {
  initialContent?: any;
  initialTitle?: string;
  initialTags?: string[];
  initialMood?: string;
  date: string;
  onSave: (data: {
    title: string;
    contentJson: any;
    contentText: string;
    tagNames: string[];
    mood: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

const MOODS = ['🚀', '⚡', '🔥', '🧘', '☕', '😴', '💪', '🎉'];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  initialContent,
  initialTitle = '',
  initialTags = [],
  initialMood = '🚀',
  date,
  onSave,
  isSaving = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [mood, setMood] = useState(initialMood);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Slash Command State
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [slashTriggerPos, setSlashTriggerPos] = useState<number | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return '标题...';
          }
          return '输入 / 唤起 Block 指令或键入文本... (Alt+↑/↓ 移动 Block，Ctrl+Enter 提交)';
        },
      }),
      CalloutNode,
      MermaidNode,
      WhiteboardNode,
      EmbedNode,
      ColumnList,
      Column,
    ],
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    onUpdate: ({ editor: ed }) => {
      // Check slash query on content update
      if (isSlashOpen && slashTriggerPos !== null) {
        const { from } = ed.state.selection;
        if (from < slashTriggerPos) {
          setIsSlashOpen(false);
          setSlashTriggerPos(null);
          return;
        }

        try {
          const text = ed.state.doc.textBetween(slashTriggerPos, from, '\n', '\n');
          if (!text.startsWith('/')) {
            setIsSlashOpen(false);
            setSlashTriggerPos(null);
          } else if (text.includes(' ') || text.includes('\n')) {
            setIsSlashOpen(false);
            setSlashTriggerPos(null);
          } else {
            setSlashQuery(text.slice(1));
          }
        } catch {
          setIsSlashOpen(false);
          setSlashTriggerPos(null);
        }
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      // If user clicks elsewhere or moves cursor far away, close slash menu
      if (isSlashOpen && slashTriggerPos !== null) {
        const { from } = ed.state.selection;
        if (from < slashTriggerPos || from > slashTriggerPos + 30) {
          setIsSlashOpen(false);
          setSlashTriggerPos(null);
        }
      }
    },
    editorProps: {
      // Notion-style block drop: move the dragged block to the drop target.
      // Returning true for block drags prevents ProseMirror's default
      // behavior of inserting the dataTransfer text into the document
      // (the "random number" bug).
      handleDrop: (view, event) => {
        const dt = event.dataTransfer;
        if (!dt) return false;

        let sourceStr = '';
        try {
          sourceStr = dt.getData(BLOCK_DRAG_MIME);
        } catch {
          return false;
        }
        if (sourceStr === '') return false; // not a block drag → default

        event.preventDefault();
        const sourcePos = parseInt(sourceStr, 10);
        if (!Number.isFinite(sourcePos) || !editor) return true;

        const targetPos = computeBlockDropTarget(view, event.clientX, event.clientY);
        if (targetPos !== null) {
          moveBlockToPosition(editor, sourcePos, targetPos);
        }
        return true;
      },
      handleKeyDown: (view, event) => {
        // Handle Alt + ArrowUp to move block up
        if (event.altKey && event.key === 'ArrowUp') {
          event.preventDefault();
          if (editor) moveBlock(editor, 'up');
          return true;
        }

        // Handle Alt + ArrowDown to move block down
        if (event.altKey && event.key === 'ArrowDown') {
          event.preventDefault();
          if (editor) moveBlock(editor, 'down');
          return true;
        }

        // Handle Ctrl + D / Cmd + D to duplicate block
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
          event.preventDefault();
          if (editor) duplicateBlock(editor);
          return true;
        }

        // Handle '/' trigger for slash menu
        if (event.key === '/') {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashPos({ x: coords.left, y: coords.bottom + 8 });
          setSlashTriggerPos(from);
          setSlashQuery('');
          setIsSlashOpen(true);
        }

        // Handle Escape to close slash menu
        if (event.key === 'Escape' && isSlashOpen) {
          setIsSlashOpen(false);
          setSlashTriggerPos(null);
        }

        // Handle Ctrl+Enter or Cmd+Enter to save immediately
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          handleManualSave();
          return true;
        }

        return false;
      },
    },
  });

  // Keep editor content in sync if initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      try {
        const content = typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent;
        editor.commands.setContent(content);
      } catch (e) {
        console.error('Failed to parse editor initial content', e);
      }
    }
  }, [initialContent, editor]);

  useEffect(() => {
    setTitle(initialTitle);
    setTags(initialTags);
    setMood(initialMood);
  }, [initialTitle, initialTags, initialMood]);

  const handleManualSave = async () => {
    if (!editor) return;
    const json = editor.getJSON();
    const text = editor.getText();

    await onSave({
      title,
      contentJson: json,
      contentText: text,
      tagNames: tags,
      mood,
    });

    const now = new Date();
    setLastSavedTime(
      `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    );
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const insertTemplate = () => {
    if (!editor) return;
    SLASH_ITEMS[0].action(editor);
  };

  const { isFullWidth, toggleFullWidth } = useCurrentUser();
  const containerWidthClass = isFullWidth
    ? 'w-full px-6 sm:px-12 lg:px-16'
    : 'max-w-5xl xl:max-w-6xl mx-auto w-full px-6 sm:px-12';

  return (
    <div className="flex-1 flex flex-col w-full bg-white dark:bg-slate-950">

      {/* Notion Document Header & Property Bar */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80">
        <div className={`${containerWidthClass} py-3 flex flex-wrap items-center justify-between gap-3 transition-all duration-200`}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mood Icon Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoodPickerOpen(!isMoodPickerOpen)}
                className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-2xl transition border border-slate-200/60 dark:border-slate-800 shadow-2xs"
                title="设置今日状态 / 图标"
              >
                <span>{mood}</span>
              </button>
              {isMoodPickerOpen && (
                <div className="absolute left-0 top-full mt-2 z-40 p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex gap-1.5 animate-in fade-in">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMood(m);
                        setIsMoodPickerOpen(false);
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-2xl transition"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tag List Property */}
            <div className="flex items-center gap-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500 transition ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {isAddingTag ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') setIsAddingTag(false);
                    }}
                    autoFocus
                    placeholder="输入标签名..."
                    className="text-sm px-3 py-1 rounded-xl border border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none w-32"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-dashed border-slate-200 dark:border-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加标签</span>
                </button>
              )}
            </div>
          </div>

          {/* Action buttons & Notion Full-Width Switch */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Notion Full Width Toggle */}
            <button
              type="button"
              onClick={toggleFullWidth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                isFullWidth
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
              title={isFullWidth ? '切换为居中标准宽度' : '切换为通栏全宽模式 (Full Width)'}
            >
              {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullWidth ? '通栏宽屏 (已开启)' : '通栏宽屏'}</span>
            </button>

            <button
              type="button"
              onClick={insertTemplate}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>插入日志模版</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-500" />
              <span>Alt+↑/↓ 移动 Block</span>
            </div>

            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '正在保存...' : '提交工作日志'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notion Full Canvas Area */}
      <div
        className={`flex-1 w-full ${containerWidthClass} py-8 pb-72 flex flex-col cursor-text transition-all duration-200`}
        onClick={(e) => {
          // If clicking anywhere in the spacious canvas or bottom buffer, focus the editor at end
          if (editor) {
            const isInsideInputOrButton = (e.target as HTMLElement).closest('input, button, select, textarea, [data-bubble-menu="true"]');
            if (!isInsideInputOrButton && e.target !== containerRef.current) {
              editor.commands.focus('end');
            }
          }
        }}
      >
        <div ref={containerRef} className="relative pl-10 sm:pl-12 flex-1 flex flex-col">
          {/* Notion-style Floating Block Drag & Action Handle */}
          <BlockDragHandle editor={editor} editorContainerRef={containerRef} />

          {/* Document Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入今日日志重点概括..."
            className="w-full text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-transparent border-none outline-none mb-8 tracking-tight"
          />

          {/* Floating Bubble Menu for Selected Text */}
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 100 }}
              className="flex items-center gap-1 bg-slate-900 text-white rounded-xl px-2 py-1.5 shadow-2xl border border-slate-700 text-sm"
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('bold') ? 'bg-slate-800 text-emerald-400 font-bold' : ''}`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('italic') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('underline') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('strike') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('highlight') ? 'bg-slate-800 text-yellow-400' : ''}`}
              >
                <Highlighter className="w-4 h-4" />
              </button>
            </BubbleMenu>
          )}

          {/* Tiptap Editor Content */}
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 flex-1 min-h-[500px]"
          />

          {/* Slash Command Overlay */}
          <SlashCommandMenu
            editor={editor}
            isOpen={isSlashOpen}
            onClose={() => {
              setIsSlashOpen(false);
              setSlashTriggerPos(null);
            }}
            position={slashPos}
            query={slashQuery}
            range={
              slashTriggerPos !== null && editor
                ? { from: slashTriggerPos, to: editor.state.selection.from }
                : undefined
            }
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30">
        <div className={`${containerWidthClass} py-3 flex items-center justify-between text-xs sm:text-sm text-slate-400 transition-all duration-200`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">📅 日期：{date}</span>
            <span>•</span>
            <span>💡 提示：输入 <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-xs">/</code> 唤起组件，悬浮左侧 <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-xs">⠿</code> 拖动或按 <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-xs">Alt + ↑/↓</code> 移动 Block</span>
          </div>
          {lastSavedTime && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              <Check className="w-4 h-4" />
              <span>已于 {lastSavedTime} 成功保存</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



