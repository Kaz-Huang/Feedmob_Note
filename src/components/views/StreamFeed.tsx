'use client';

import React, { useState } from 'react';
import { WorkLog } from '@/types';
import { useCurrentUser } from '@/lib/user-context';
import {
  AlertTriangle,
  MessageSquare,
  Send,
  Calendar,
  FileText,
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
      <div className="flex flex-col items-center justify-center py-16 bg-[var(--background)] rounded-md border border-[var(--border)] text-[var(--muted-foreground)]">
        <FileText className="w-7 h-7 shrink-0 mb-3" aria-hidden="true" />
        <p className="text-sm font-medium">暂无符合条件的团队日志</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-4">
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
            className={`bg-[var(--background)]  rounded-md border transition  ${
              log.hasBlocker
                ? 'border-red-200 dark:border-red-900/60 shadow-red-500/5'
                : 'border-[var(--border)]  hover:border-[var(--border)] '
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                {log.user?.avatar ? (
                  <img
                    src={log.user.avatar}
                    alt={log.user.name}
                    className="w-8 h-8 shrink-0 rounded object-cover ring-2 ring-[var(--border)]"
                  />
                ) : (
                  <div className="w-8 h-8 shrink-0 rounded bg-[var(--sidebar-accent)] text-[var(--foreground)] flex items-center justify-center font-medium text-sm">
                    {log.user?.name?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-medium text-sm text-[var(--foreground)]">
                      {log.user?.name}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-[var(--muted)] text-[var(--foreground)] font-medium">
                      {log.user?.team?.name || log.user?.title || log.user?.role}
                    </span>
                    {log.mood && <span className="text-lg">{log.mood}</span>}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-2">
                    <span className="font-semibold">{log.date}</span>
                    <span>•</span>
                    <span>{new Date(log.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 提交</span>
                  </div>
                </div>
              </div>

              {/* Badges (Blocker status, tags) */}
              <div className="flex items-center gap-2 flex-wrap">
                {log.hasBlocker && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span>包含阻塞点</span>
                  </div>
                )}
                {log.tags?.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--muted)] text-[var(--foreground)]"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Title & Body Content */}
            <div className="px-4 sm:px-5 py-4">
              {log.title && (
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-3.5">
                  {log.title}
                </h3>
              )}

              {/* Text Summary/Snippet View */}
              <div className="prose dark:prose-invert max-w-none text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-line break-words">
                {log.contentText || '（暂无详细文本）'}
              </div>
            </div>

            {/* Reactions & Comments Bar */}
            <div className="px-4 sm:px-5 py-4 bg-[var(--muted)] border-t border-[var(--border)] flex flex-col gap-3.5">
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
                        aria-label={`${data?.hasReacted ? '取消' : '添加'} ${emoji} 反应${data ? `，${data.count} 人` : ''}`}
                        aria-pressed={!!data?.hasReacted}
                        disabled={!currentUser}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition border ${
                          data?.hasReacted
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                            : 'bg-[var(--background)]  border-[var(--border)]  text-[var(--foreground)]  hover:border-[var(--border)]'
                        }`}
                        title={data ? data.users.join(', ') : '签阅'}
                      >
                        <span className="text-base">{emoji}</span>
                        {data && <span className="font-medium">{data.count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 font-medium">
                  <MessageSquare className="w-4 h-4" />
                  <span>{log.comments?.length || 0} 条协作互动</span>
                </div>
              </div>

              {/* Comments Stream */}
              {log.comments && log.comments.length > 0 && (
                <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--border)]">
                  {log.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-3 rounded bg-[var(--background)] border border-[var(--border)] text-sm"
                    >
                      {c.user?.avatar ? (
                        <img
                          src={c.user.avatar}
                          alt={c.user.name}
                          className="w-7 h-7 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 shrink-0 rounded bg-[var(--muted)] text-xs font-medium flex items-center justify-center">
                          {c.user?.name?.[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--foreground)] text-sm">
                            {c.user?.name}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {new Date(c.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[var(--foreground)] mt-1 break-words leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Comment Input */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <input
                  type="text"
                  aria-label={`评论 ${log.user?.name || '成员'} 的 ${log.date} 日志`}
                  value={commentInputs[log.id] || ''}
                  onChange={(e) =>
                    setCommentInputs({ ...commentInputs, [log.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && isSubmittingComment !== log.id) handleAddComment(log.id);
                  }}
                  placeholder="留下反馈或协助建议（按 Enter 发送）..."
                  className="min-w-0 flex-1 text-sm px-3 py-2 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleAddComment(log.id)}
                  aria-label={isSubmittingComment === log.id ? '正在发送评论' : '发送评论'}
                  disabled={isSubmittingComment === log.id || !commentInputs[log.id]?.trim() || !currentUser}
                  className="px-4 py-2 rounded bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold hover:brightness-95 transition disabled:opacity-50 flex items-center gap-1.5"
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

