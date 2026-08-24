'use client';

import React, { useState, useEffect } from 'react';
import { Tag, WorkLog } from '@/types';
import { Hash, Layers, Filter, Clock, User as UserIcon } from 'lucide-react';

interface TagMatrixViewProps {
  logs: WorkLog[];
}

export const TagMatrixView: React.FC<TagMatrixViewProps> = ({ logs }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        setTags(data);
        if (data.length > 0 && !selectedTag) {
          setSelectedTag(data[0].name);
        }
      })
      .catch(console.error);
  }, []);

  const filteredLogs = selectedTag
    ? logs.filter((l) => l.tags?.some((t) => t.tag.name === selectedTag))
    : logs;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left Column: Tag List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Hash className="w-4 h-4" />
          <span>项目 / 客户标签透视</span>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || '#10b981' }}
                  />
                  <span className="truncate">#{tag.name}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Matched Logs */}
      <div className="md:col-span-3 flex flex-col gap-4">
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400">当前透视标签:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
              #{selectedTag || '全部'}
            </span>
          </div>
          <span className="text-slate-400 font-medium">共匹配到 {filteredLogs.length} 条相关日志</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            该标签下暂无关联的工作日志
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  {log.user?.avatar ? (
                    <img
                      src={log.user.avatar}
                      alt={log.user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {log.user?.name?.[0]}
                    </div>
                  )}
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {log.user?.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({log.user?.team?.name})
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">📅 {log.date}</span>
              </div>

              {log.title && (
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {log.title}
                </div>
              )}

              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {log.contentText}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

