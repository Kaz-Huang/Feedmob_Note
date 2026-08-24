'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/lib/user-context';
import { WorkLog } from '@/types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const BlockEditor = dynamic(
  () => import('@/components/editor/BlockEditor').then((mod) => mod.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-[500px] text-slate-400 text-sm animate-pulse">
        正在加载 Notion 编辑器...
      </div>
    ),
  }
);

export default function TodayFocusPage() {
  const { currentUser } = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentLog, setCurrentLog] = useState<WorkLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current user's log for selectedDate
  const fetchCurrentLog = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs?userId=${currentUser.id}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setCurrentLog(data[0]);
        } else {
          setCurrentLog(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch current log', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCurrentLog();
    }
  }, [currentUser, selectedDate]);

  const handleSaveLog = async (data: {
    title: string;
    contentJson: any;
    contentText: string;
    tagNames: string[];
    mood: string;
  }) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          date: selectedDate,
          title: data.title,
          contentJson: data.contentJson,
          contentText: data.contentText,
          tagNames: data.tagNames,
          mood: data.mood,
        }),
      });

      if (res.ok) {
        const savedLog = await res.json();
        setCurrentLog(savedLog);
      }
    } catch (e) {
      console.error('Failed to save log', e);
    } finally {
      setIsSaving(false);
    }
  };

  const changeDateBy = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  return (
    <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-4rem)] bg-white dark:bg-slate-950">
      {/* Top Notion-style Sub-header Bar (Date switcher & Breadcrumb) */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-12 py-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">工作日志 /</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => changeDateBy(-1)}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="前一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-bold px-2.5 py-0.5 rounded-lg bg-transparent border-0 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => changeDateBy(1)}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isToday ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              今天
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              回到今天
            </button>
          )}
        </div>
      </div>

      {/* Notion Full-Page Canvas */}
      <div className="flex-1 w-full flex flex-col">
        <BlockEditor
          key={`${currentUser?.id}-${selectedDate}`}
          date={selectedDate}
          initialTitle={currentLog?.title || ''}
          initialContent={currentLog?.contentJson}
          initialTags={currentLog?.tags?.map((t) => t.tag.name) || []}
          initialMood={currentLog?.mood || '🚀'}
          onSave={handleSaveLog}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}


