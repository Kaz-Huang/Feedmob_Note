'use client';

import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { CalendarView } from '@/components/views/CalendarView';
import { WorkLog } from '@/types';
import { useRouter } from 'next/navigation';

export default function CalendarPage() {
  const router = useRouter();
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
        console.error('Failed to fetch calendar logs', e);
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
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto w-full pb-12">
      <CalendarView logs={logs} onSelectDate={handleSelectDate} />
    </div>
  );

}
