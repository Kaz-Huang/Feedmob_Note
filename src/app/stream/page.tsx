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
    <div className="flex flex-col gap-6 pb-12">
      {/* Stream Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              团队时序流大盘 (Team Stream Feed)
            </h1>
            <p className="text-xs text-slate-400">
              实时聚合团队成员日志流，一屏掌握进展与卡点阻碍
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHasBlockerOnly(!hasBlockerOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              hasBlockerOnly
                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>仅看卡点 Blocker</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            title="刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stream Feed Component */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          正在加载团队时序流...
        </div>
      ) : (
        <StreamFeed logs={logs} onRefresh={fetchLogs} />
      )}
    </div>
  );
}
