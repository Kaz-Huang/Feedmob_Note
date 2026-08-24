'use client';

import React, { useState } from 'react';
import { WorkLog } from '@/types';
import { useCurrentUser } from '@/lib/user-context';
import {
  AlertTriangle,
  MessageSquare,
  Smile,
  Send,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface StreamFeedProps {
  logs: WorkLog[];
  onRefresh: () => void;
}

const EMOJIS = ['👍', '👀', '🚀', '🎯', '❤️'];

export const StreamFeed: React.FC<StreamFeedProps> = ({ logs, onRefresh }) => {
  const { currentUser } = useCurrentUser();
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);

  const handleToggleReaction = async (logId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/logs/${logId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, emoji }),
      });
      if (res.ok) onRefresh();
    } catch (e) {
      console.error('Failed to toggle reaction', e);
    }
  };

  const handleAddComment = async (logId: string) => {
    const text = commentInputs[logId]?.trim();
    if (!text || !currentUser) return;

    setIsSubmittingComment(logId);
    try {
      const res = await fetch(`/api/logs/${logId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content: text }),
      });
      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [logId]: '' }));
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to add comment', e);
    } finally {
      setIsSubmittingComment(null);
    }
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
        <Sparkles className="w-10 h-10 mb-3 text-emerald-500 opacity-60" />
        <p className="text-base font-medium">暂无符合条件的团队日志</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      {logs.map((log) => {
        // Group reactions by emoji
        const reactionCounts: Record<string, { count: number; hasReacted: boolean; users: string[] }> = {};
        for (const r of log.reactions || []) {
          if (!reactionCounts[r.emoji]) {
            reactionCounts[r.emoji] = { count: 0, hasReacted: false, users: [] };
          }
          reactionCounts[r.emoji].count += 1;
          reactionCounts[r.emoji].users.push(r.user?.name || '某成员');
          if (r.userId === currentUser?.id) {
            reactionCounts[r.emoji].hasReacted = true;
          }
        }

        return (
          <div
            key={log.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border transition shadow-xs ${
              log.hasBlocker
                ? 'border-red-200 dark:border-red-900/60 shadow-red-500/5'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                {log.user?.avatar ? (
                  <img
                    src={log.user.avatar}
                    alt={log.user.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500/20"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    {log.user?.name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {log.user?.name}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {log.user?.team?.name || log.user?.title || log.user?.role}
                    </span>
                    {log.mood && <span className="text-lg">{log.mood}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span className="font-semibold">📅 {log.date}</span>
                    <span>•</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 提交</span>
                  </div>
                </div>
              </div>

              {/* Badges (Blocker status, tags) */}
              <div className="flex items-center gap-2 flex-wrap">
                {log.hasBlocker && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                    <span>包含阻塞点</span>
                  </div>
                )}
                {log.tags?.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Title & Body Content */}
            <div className="p-6">
              {log.title && (
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-3.5">
                  {log.title}
                </h3>
              )}

              {/* Text Summary/Snippet View */}
              <div className="prose dark:prose-invert max-w-none text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50/60 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {log.contentText || '（暂无详细文本）'}
              </div>
            </div>

            {/* Reactions & Comments Bar */}
            <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3.5">
              {/* Reactions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {EMOJIS.map((emoji) => {
                    const data = reactionCounts[emoji];
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(log.id, emoji)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition border ${
                          data?.hasReacted
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                        title={data ? data.users.join(', ') : '签阅'}
                      >
                        <span className="text-base">{emoji}</span>
                        {data && <span className="font-bold">{data.count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <MessageSquare className="w-4 h-4" />
                  <span>{log.comments?.length || 0} 条协作互动</span>
                </div>
              </div>

              {/* Comments Stream */}
              {log.comments && log.comments.length > 0 && (
                <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  {log.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-sm"
                    >
                      {c.user?.avatar ? (
                        <img
                          src={c.user.avatar}
                          alt={c.user.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 text-xs font-bold flex items-center justify-center">
                          {c.user?.name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {c.user?.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Comment Input */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="text"
                  value={commentInputs[log.id] || ''}
                  onChange={(e) =>
                    setCommentInputs({ ...commentInputs, [log.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment(log.id);
                  }}
                  placeholder="留下反馈或协助建议（按 Enter 发送）..."
                  className="flex-1 text-sm px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddComment(log.id)}
                  disabled={isSubmittingComment === log.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

