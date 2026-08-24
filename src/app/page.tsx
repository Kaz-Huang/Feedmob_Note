'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/lib/user-context';
import { WorkLog } from '@/types';

// Dynamic import with ssr: false prevents Tiptap/DOM hydration mismatches on Fast Refresh
const BlockEditor = dynamic(
  () => import('@/components/editor/BlockEditor').then((mod) => mod.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs animate-pulse">
        正在加载 Block 编辑器...
      </div>
    ),
  }
);
import {
  Calendar,
  Sparkles,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function TodayFocusPage() {
  const { currentUser, selectedTeamId } = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentLog, setCurrentLog] = useState<WorkLog | null>(null);
  const [teamLogs, setTeamLogs] = useState<WorkLog[]>([]);
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

  // Fetch team pulse for selectedDate
  const fetchTeamLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedTeamId) params.append('teamId', selectedTeamId);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTeamLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch team logs', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCurrentLog();
    }
    fetchTeamLogs();
  }, [currentUser, selectedDate, selectedTeamId]);

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
        fetchTeamLogs();
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
    <div className="flex flex-col gap-8 pb-12">
      {/* Date Navigation & Focus Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isToday ? '今日工作日志' : `${selectedDate} 工作日志`}
              </h1>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  今天
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              记录今日突破、卡点与明日规划（60秒极速录入）
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-transparent border-0 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
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
      </div>

      {/* Block Editor Section */}
      <section>
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
      </section>

      {/* Today's Team Pulse Quick Summary */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              团队动态概览 ({selectedDate})
            </h2>
          </div>
          <Link
            href="/stream"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>进入时序大盘</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teamLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3.5 rounded-xl border transition ${
                log.hasBlocker
                  ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {log.user?.avatar ? (
                    <img
                      src={log.user.avatar}
                      alt={log.user.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {log.user?.name?.[0]}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {log.user?.name}
                  </span>
                  <span className="text-xs">{log.mood}</span>
                </div>
                {log.hasBlocker && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 dark:bg-red-950 text-red-600">
                    卡点
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {log.title || log.contentText}
              </p>
            </div>
          ))}

          {teamLogs.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              当天暂无团队成员提交日志
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
