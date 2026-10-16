'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { StreamFeed } from '@/components/views/StreamFeed';
import { WorkLog } from '@/types';
import {
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function StreamPage() {
  const { selectedTeamId, loadError: workspaceError } = useCurrentUser();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [hasBlockerOnly, setHasBlockerOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
      setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      if (hasBlockerOnly) params.append('hasBlocker', 'true');

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error('日志加载失败，请稍后重试。');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch stream logs', e);
      setLoadError(e instanceof Error ? e.message : '日志加载失败。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedTeamId, hasBlockerOnly]);

  return (
    <div className="flex flex-col gap-5 px-4 py-7 sm:px-8 lg:px-10 max-w-6xl mx-auto w-full pb-12">

      {/* Stream Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              团队动态
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              查看团队的工作进展、反馈与阻塞点。
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHasBlockerOnly(!hasBlockerOnly)}
            aria-pressed={hasBlockerOnly}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition border ${
              hasBlockerOnly
                ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 '
                : 'bg-[var(--background)]  border-[var(--border)]  text-[var(--foreground)]  hover:border-[var(--border)]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>仅看阻塞点</span>
          </button>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2.5 rounded bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)] transition"
            title="刷新"
            aria-label="刷新团队动态"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stream Feed Component */}
      {workspaceError || loadError ? <p role="alert" className="rounded border border-[var(--border)] p-4 text-sm">{workspaceError || loadError}</p> : isLoading ? (
        <div className="py-20 text-center text-sm text-[var(--muted-foreground)]">
          正在加载团队时序流...
        </div>
      ) : (
        <StreamFeed logs={logs} onRefresh={fetchLogs} />
      )}
    </div>
  );
}

