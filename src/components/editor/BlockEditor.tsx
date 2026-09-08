'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { SelectionToolbar } from './SelectionToolbar';
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
import { SlashCommandMenu, LOG_TEMPLATE } from './SlashCommandMenu';
import { BlockDragHandle } from './BlockDragHandle';
import { moveBlock, duplicateBlock } from './utils/block-movement';
import {
  computeBlockDropTarget,
  moveBlockToDropTarget,
} from './utils/block-movement';
import { SlashCommand } from './extensions/SlashCommand';
import { getDraggedBlockPos } from './utils/block-drag';
import { useSlashCommand } from './useSlashCommand';
import { parseDocument, snapshotKey, type DocumentSnapshot } from './utils/document';
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
  Plus,
  X,
  ArrowUpDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';


interface BlockEditorProps {
  initialContent?: unknown;
  initialTitle?: string;
  initialTags?: string[];
  initialMood?: string;
  date: string;
  documentId: string;
  onSave: (data: DocumentSnapshot & { contentText: string }) => Promise<void>;
  isSaving?: boolean;
}

const MOODS = ['🚀', '⚡', '🔥', '🧘', '☕', '😴', '💪', '🎉'];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  initialContent,
  initialTitle = '',
  initialTags = [],
  initialMood = '🚀',
  date,
  documentId,
  onSave,
  isSaving = false,
}) => {
  const draftKey = 'feedmob-draft:' + documentId;
  const [initialSnapshot] = useState<DocumentSnapshot>(() => {
    const server = { title: initialTitle, contentJson: parseDocument(initialContent), tagNames: initialTags, mood: initialMood };
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (draft && typeof draft.title === 'string' && typeof draft.mood === 'string' && Array.isArray(draft.tagNames) && draft.tagNames.every((tag: unknown) => typeof tag === 'string')) {
        return { ...draft, contentJson: parseDocument(draft.contentJson) };
      }
    } catch { /* Storage may be unavailable; editing still works. */ }
    return server;
  });
  const [title, setTitle] = useState(initialSnapshot.title);
  const [tags, setTags] = useState<string[]>(initialSnapshot.tagNames);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [mood, setMood] = useState(initialSnapshot.mood);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const savingRef = useRef(false);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [draftStored, setDraftStored] = useState(true);
  const savedRef = useRef(snapshotKey({ title: initialTitle, contentJson: parseDocument(initialContent), tagNames: initialTags, mood: initialMood }));

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
          return '输入文字，或按 / 选择块类型';
        },
      }),
      CalloutNode,
      MermaidNode,
      WhiteboardNode,
      EmbedNode,
      ColumnList,
      Column,
      SlashCommand,
    ],
    content: initialSnapshot.contentJson,
    editorProps: {
      handleDOMEvents: {
        // Let the native IME commit its candidate without passing Enter through
        // ProseMirror keymaps. Returning here does not prevent the DOM default.
        keydown: (view, event) => event.isComposing || view.composing || event.keyCode === 229,
        dragover: (view, event) => {
          const isBlock = getDraggedBlockPos(view) !== null;
          if (isBlock) {
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            return true;
          }
          return false;
        },
      },
      handleDrop: (view, event) => {
        const sourcePos = getDraggedBlockPos(view);
        if (sourcePos === null || !editor) return false;

        event.preventDefault();
        if (typeof document !== 'undefined') {
          document.querySelectorAll('.feedmob-drag-source-active').forEach((el) => {
            el.classList.remove('feedmob-drag-source-active');
          });
        }
        const dropTarget = computeBlockDropTarget(view, event.clientX, event.clientY, {
          sourcePos,
        });
        if (dropTarget !== null) {
          moveBlockToDropTarget(editor, sourcePos, dropTarget);
        }
        return true;
      },
      handleClick: (view, pos, event) => {
        const dom = event.target as HTMLElement;
        if (dom === view.dom && event.clientY >= (view.dom.lastElementChild?.getBoundingClientRect().bottom ?? 0)) {
          const { doc } = view.state;
          const lastChild = doc.lastChild;
          const isLastEmpty =
            lastChild &&
            lastChild.type.name === 'paragraph' &&
            lastChild.content.size === 0;

          if (!isLastEmpty && editor) {
            editor
              .chain()
              .focus()
              .insertContentAt(doc.content.size, { type: 'paragraph' })
              .setTextSelection(doc.content.size + 1)
              .run();
            return true;
          }
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.isComposing || view.composing || event.keyCode === 229) return false;
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

  const slash = useSlashCommand(editor);
  const currentSnapshotRef = useRef(initialSnapshot);
  currentSnapshotRef.current = { title, contentJson: editor?.getJSON() ?? initialSnapshot.contentJson, tagNames: tags, mood };

  // A mounted editor owns one document. Save responses are acknowledgements,
  // never new editor input. Persist local drafts across date/user navigation.
  useEffect(() => {
    if (!editor) return;
    const persist = () => {
      const snapshot = { ...currentSnapshotRef.current, contentJson: editor.getJSON() };
      currentSnapshotRef.current = snapshot;
      const dirty = snapshotKey(snapshot) !== savedRef.current;
      setIsDirty(dirty);
      try {
        if (dirty) localStorage.setItem(draftKey, JSON.stringify(snapshot));
        else localStorage.removeItem(draftKey);
        setDraftStored(true);
      } catch { setDraftStored(false); setSaveError('本地草稿无法保存，请及时提交日志。'); }
    };
    persist();
    editor.on('update', persist);
    return () => { editor.off('update', persist); };
  }, [editor, title, tags, mood, draftKey]);

  const handleManualSave = async () => {
    if (!editor || isSaving || savingRef.current) return;
    savingRef.current = true;
    setSavePending(true);
    setSaveError(null);
    const snapshot = { title, contentJson: editor.getJSON(), tagNames: tags, mood };
    try {
      await onSave({ ...snapshot, contentText: editor.getText() });
      savedRef.current = snapshotKey(snapshot);
      const dirty = snapshotKey(currentSnapshotRef.current) !== savedRef.current;
      setIsDirty(dirty);
      if (!dirty) {
        try {
          // An older, unmounted editor must not erase a newer draft of this date.
          const stored = localStorage.getItem(draftKey);
          if (stored === snapshotKey(snapshot)) localStorage.removeItem(draftKey);
        } catch {}
      }
      setLastSavedTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请重试。');
    } finally {
      savingRef.current = false;
      setSavePending(false);
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#+/, '').trim();
    if (!cleanTag) return;
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
    LOG_TEMPLATE.action(editor);
  };

  const { isFullWidth, toggleFullWidth } = useCurrentUser();
  const containerWidthClass = isFullWidth
    ? 'w-full px-6 sm:px-12 lg:px-16'
    : 'max-w-6xl xl:max-w-7xl mx-auto w-full px-6 sm:px-12 lg:px-16';

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
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddTag();
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
              disabled={isSaving || savePending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving || savePending ? '正在保存...' : '提交工作日志'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notion Full Canvas Area */}
      <div
        className={`flex-1 w-full ${containerWidthClass} py-8 pb-72 flex flex-col cursor-text transition-all duration-200`}
        onClick={(e) => {
          if (!editor) return;
          const target = e.target as HTMLElement;
          if (target.closest('input, button, select, textarea, [data-bubble-menu="true"]')) {
            return;
          }
          // Clicks inside the editor itself (or on the floating block handle)
          // are ProseMirror's business — intercepting them here used to force
          // the caret to the document end on every click.
          if (target.closest('.tiptap') || target.closest('[data-block-handle]')) {
            return;
          }

          // If clicking anywhere in the spacious canvas or bottom buffer:
          const { doc } = editor.state;
          const lastChild = doc.lastChild;

          const isLastChildEmptyParagraph =
            lastChild &&
            lastChild.type.name === 'paragraph' &&
            lastChild.content.size === 0;

          if (!isLastChildEmptyParagraph) {
            // Last block has text/content: insert a fresh block below and focus it
            editor
              .chain()
              .focus()
              .insertContentAt(doc.content.size, { type: 'paragraph' })
              .setTextSelection(doc.content.size + 1)
              .run();
          } else {
            // Already an empty block at the end: focus it directly
            editor.commands.focus('end');
          }
        }}
      >
        <div ref={containerRef} className="relative pl-14 sm:pl-16 flex-1 flex flex-col">
          {/* Notion-style Floating Block Drag & Action Handle */}
          <BlockDragHandle editor={editor} editorContainerRef={containerRef} />

          {/* Document Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void handleManualSave(); }
              else if (event.key === 'Enter' || event.key === 'ArrowDown') { event.preventDefault(); editor?.commands.focus('start'); }
            }}
            aria-label="日志标题"
            placeholder="输入今日日志重点概括..."
            className="w-full text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-transparent border-none outline-none mb-8 tracking-tight"
          />

          {/* Floating Bubble Menu for Selected Text */}
          {editor && (
            <SelectionToolbar
              editor={editor}
              className="flex items-center gap-1 bg-slate-900 text-white rounded-xl px-2 py-1.5 shadow-2xl border border-slate-700 text-sm"
            >
              <button
                aria-label="加粗"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('bold') ? 'bg-slate-800 text-emerald-400 font-bold' : ''}`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                aria-label="斜体"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('italic') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                aria-label="下划线"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('underline') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <button
                aria-label="删除线"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('strike') ? 'bg-slate-800 text-emerald-400' : ''}`}
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                aria-label="高亮"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('highlight') ? 'bg-slate-800 text-yellow-400' : ''}`}
              >
                <Highlighter className="w-4 h-4" />
              </button>
            </SelectionToolbar>
          )}

          {/* Tiptap Editor Content */}
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 flex-1 min-h-[500px]"
          />

          {/* Slash Command Overlay */}
          <SlashCommandMenu
            editor={editor}
            isOpen={!!slash.match}
            onClose={slash.close}
            position={slash.position}
            query={slash.match?.query}
            range={slash.match ? { from: slash.match.from, to: slash.match.to } : undefined}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30">
        <div className={`${containerWidthClass} py-3 flex items-center justify-between text-xs sm:text-sm text-slate-400 transition-all duration-200`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">📅 日期：{date}</span>
            <span>•</span>
            <span>💡 提示：输入 <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-xs">/</code> 唤起组件；拖到块的上下方调整顺序，拖到左右边缘并排分栏；也可按 <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-xs">Alt + ↑/↓</code> 移动 Block</span>
          </div>
          {saveError && <span role="alert" className="text-red-600">{saveError}</span>}
          {isDirty && <span role="status" className="text-amber-600">有未提交修改{draftStored ? ' · 已保留本地草稿' : ' · 请及时提交'}</span>}
          {lastSavedTime && !isDirty && !saveError && (
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
