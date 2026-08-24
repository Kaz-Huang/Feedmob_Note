'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { StreamFeed } from '@/components/views/StreamFeed';
import { WorkLog } from '@/types';
import {
  Activity,
  AlertTriangle,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function StreamPage() {
  const { selectedTeamId } = useCurrentUser();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [hasBlockerOnly, setHasBlockerOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      if (hasBlockerOnly) params.append('hasBlocker', 'true');

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch stream logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedTeamId, hasBlockerOnly]);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto w-full pb-12">

      {/* Stream Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              团队时序流大盘 (Team Stream Feed)
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              实时聚合团队成员日志流，一屏掌握进展与卡点阻碍
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHasBlockerOnly(!hasBlockerOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition border ${
              hasBlockerOnly
                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 shadow-xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>仅看卡点 Blocker</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stream Feed Component */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          正在加载团队时序流...
        </div>
      ) : (
        <StreamFeed logs={logs} onRefresh={fetchLogs} />
      )}
    </div>
  );
}

