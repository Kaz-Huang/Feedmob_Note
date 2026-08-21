'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { TagMatrixView } from '@/components/views/TagMatrixView';
import { WorkLog } from '@/types';

export default function TagsPage() {
  const { selectedTeamId } = useCurrentUser();
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTeamId) params.append('teamId', selectedTeamId);

        const res = await fetch(`/api/logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (e) {
        console.error('Failed to fetch tag logs', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [selectedTeamId]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          正在加载标签矩阵...
        </div>
      ) : (
        <TagMatrixView logs={logs} />
      )}
    </div>
  );
}
