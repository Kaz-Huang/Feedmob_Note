'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { CalendarView } from '@/components/views/CalendarView';
import { WorkLog } from '@/types';
import { useRouter } from 'next/navigation';

export default function CalendarPage() {
  const router = useRouter();
  const { selectedTeamId, loadError: workspaceError } = useCurrentUser();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (selectedTeamId) params.append('teamId', selectedTeamId);

        const res = await fetch(`/api/logs?${params.toString()}`);
        if (!res.ok) throw new Error('日志加载失败，请稍后重试。');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch calendar logs', e);
        setLoadError(e instanceof Error ? e.message : '日志加载失败。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [selectedTeamId]);

  const handleSelectDate = (dateStr: string) => {
    router.push(`/?date=${dateStr}`);
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-7 sm:px-8 lg:px-10 max-w-6xl mx-auto w-full pb-12">
      {workspaceError || loadError ? <p role="alert" className="rounded border border-[var(--border)] p-4 text-sm">{workspaceError || loadError}</p> : isLoading ? <p role="status" className="py-12 text-sm text-[var(--muted-foreground)]">正在加载日历…</p> : <CalendarView logs={logs} onSelectDate={handleSelectDate} />}
    </div>
  );

}
