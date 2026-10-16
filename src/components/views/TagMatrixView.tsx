'use client';

import React, { useState, useEffect } from 'react';
import { Tag, WorkLog } from '@/types';
import { Hash } from 'lucide-react';

interface TagMatrixViewProps {
  logs: WorkLog[];
}

export const TagMatrixView: React.FC<TagMatrixViewProps> = ({ logs }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => { if (!res.ok) throw new Error('标签加载失败，请稍后重试。'); return res.json(); })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('标签数据格式异常。');
        setTags(data);
        if (data.length > 0 && !selectedTag) {
          setSelectedTag(data[0].name);
        }
      })
      .catch(error => setTagError(error instanceof Error ? error.message : '标签加载失败。'));
  }, []);

  const filteredLogs = selectedTag
    ? logs.filter((l) => l.tags?.some((t) => t.tag.name === selectedTag))
    : logs;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      {/* Left Column: Tag List */}
      <div className="bg-[var(--background)] rounded-md border border-[var(--border)] p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]">
          <Hash className="w-4 h-4" />
          <span>项目 / 客户</span>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <button type="button" aria-pressed={selectedTag === null} onClick={() => setSelectedTag(null)} className={`flex min-h-10 items-center justify-between rounded px-3 text-sm hover:bg-[var(--muted)] ${selectedTag === null ? 'bg-[var(--muted)] font-medium' : ''}`}><span>全部日志</span><span className="text-xs text-[var(--muted-foreground)]">{logs.length}</span></button>
          {tagError && <p role="alert" className="px-3 py-2 text-xs text-red-600">{tagError}</p>}
          {!tagError && tags.length === 0 && <p className="px-3 py-2 text-xs text-[var(--muted-foreground)]">暂无项目标签</p>}
          {tags.map((tag) => {
            const count = logs.filter((l) =>
              l.tags?.some((t) => t.tag.name === tag.name)
            ).length;
            const isSelected = selectedTag === tag.name;

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(tag.name)}
                aria-pressed={isSelected}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-[var(--muted)]  text-[var(--foreground)]  font-medium border border-[var(--border)] '
                    : 'text-[var(--foreground)]  hover:bg-[var(--muted)] '
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded shrink-0"
                    style={{ backgroundColor: tag.color || 'var(--muted-foreground)' }}
                  />
                  <span className="truncate">#{tag.name}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] font-medium">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Matched Logs */}
      <div className="min-w-0 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--background)] px-4 py-3 rounded-md border border-[var(--border)] text-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className="text-[var(--muted-foreground)]">标签：</span>
            <span className="font-medium text-[var(--foreground)] text-sm break-words">
              #{selectedTag || '全部'}
            </span>
          </div>
          <span className="text-[var(--muted-foreground)] font-medium">{filteredLogs.length} 条日志</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="px-4 py-12 text-center bg-[var(--background)] rounded-md border border-[var(--border)] text-[var(--muted-foreground)] text-sm">
            该标签下暂无关联的工作日志
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 sm:p-5 bg-[var(--background)] rounded-md border border-[var(--border)] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--border)] pb-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  {log.user?.avatar ? (
                    <img
                      src={log.user.avatar}
                      alt={log.user.name}
                      className="w-7 h-7 rounded object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-[var(--sidebar-accent)] text-[var(--foreground)] text-xs font-medium flex items-center justify-center">
                      {log.user?.name?.[0]}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {log.user?.name}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {log.user?.team?.name}
                  </span>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] font-medium">{log.date}</span>
              </div>

              {log.title && (
                <div className="text-base font-medium text-[var(--foreground)]">
                  {log.title}
                </div>
              )}

              <p className="text-sm text-[var(--foreground)] whitespace-pre-line break-words leading-relaxed">
                {log.contentText}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

