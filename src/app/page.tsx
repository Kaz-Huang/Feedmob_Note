'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useCurrentUser } from '@/lib/user-context';
import { parseDocument } from '@/components/editor/utils/document';
import { format, addDays } from 'date-fns';
import { WorkLog } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const BlockEditor = dynamic(
  () => import('@/components/editor/BlockEditor').then((mod) => mod.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-[400px] text-[var(--muted-foreground)] text-sm">
        正在准备编辑器…
      </div>
    ),
  }
);

export default function TodayFocusPage() {
  const { currentUser, loadError: workspaceError, refreshUsers } = useCurrentUser();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [currentLog, setCurrentLog] = useState<WorkLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const documentId = currentUser ? currentUser.id + ':' + selectedDate : '';
  useEffect(() => {
    const readDate = () => {
      const value = new URLSearchParams(window.location.search).get('date');
      if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(value + 'T12:00:00');
        if (!Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === value) setSelectedDate(value);
      }
    };
    readDate();
    window.addEventListener('popstate', readDate);
    return () => window.removeEventListener('popstate', readDate);
  }, []);

  const activeKeyRef = useRef(documentId);
  activeKeyRef.current = documentId;

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    const key = documentId;
    setIsLoading(true);
    setLoadError(null);
    setIsSaving(false);
    const load = async () => {
      try {
        const res = await fetch('/api/logs?userId=' + encodeURIComponent(currentUser.id) + '&date=' + selectedDate, { signal: controller.signal });
        if (!res.ok) throw new Error('日志加载失败，请重试。');
        const logs = await res.json();
        const log = logs[0] ?? null;
        if (log) parseDocument(log.contentJson);
        if (!controller.signal.aborted && activeKeyRef.current === key) {
          setCurrentLog(log);
          setLoadedKey(key);
        }
      } catch (error) {
        if (!controller.signal.aborted && activeKeyRef.current === key) setLoadError(error instanceof Error ? error.message : '日志加载失败。');
      } finally {
        if (!controller.signal.aborted && activeKeyRef.current === key) setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [currentUser?.id, selectedDate, documentId, retry]);

  const handleSaveLog = async (data: {
    title: string;
    contentJson: any;
    contentText: string;
    tagNames: string[];
    mood: string;
  }) => {
    if (!currentUser) throw new Error('请先选择用户。');
    const savingKey = documentId;
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

      if (!res.ok) throw new Error('保存失败，请重试。你的本地修改仍然保留。');
      // Do not feed acknowledgements back as new editor content.
      await res.json();
    } finally {
      if (activeKeyRef.current === savingKey) setIsSaving(false);
    }
  };

  const changeDateBy = (days: number) => {
    setSelectedDate(format(addDays(new Date(selectedDate + 'T12:00:00'), days), 'yyyy-MM-dd'));
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDate === todayStr;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-1 flex-col bg-[var(--background)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
          <button type="button" onClick={() => changeDateBy(-1)} aria-label="前一天" title="前一天" className="flex min-h-10 min-w-9 items-center justify-center rounded transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /></button>
          <input aria-label="日志日期" type="date" value={selectedDate} onChange={event => { if (event.target.value) setSelectedDate(event.target.value); }} className="min-h-9 w-[142px] cursor-pointer rounded border border-transparent bg-transparent px-1.5 text-sm text-[var(--foreground)] hover:border-[var(--border)]" />
          <button type="button" onClick={() => changeDateBy(1)} aria-label="后一天" title="后一天" className="flex min-h-10 min-w-9 items-center justify-center rounded transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"><ChevronRight size={16} /></button>
          {isToday ? <span className="ml-2 text-xs">今天</span> : <button type="button" onClick={() => setSelectedDate(todayStr)} className="ml-1 min-h-9 rounded px-2 text-xs transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]">回到今天</button>}
        </div>
        <span className="hidden text-xs text-[var(--muted-foreground)] sm:block">{currentUser?.name ? `${currentUser.name} 的日志` : '工作日志'}</span>
      </div>
      <div className="flex w-full flex-1 flex-col">
        {workspaceError ? (
          <div role="alert" className="mx-auto w-full max-w-3xl px-6 py-12 text-sm"><p>{workspaceError}</p><button type="button" className="mt-3 rounded border border-[var(--border)] px-3 py-2 hover:bg-[var(--muted)]" onClick={() => void refreshUsers()}>重新加载工作区</button></div>
        ) : loadError ? (
          <div role="alert" className="mx-auto w-full max-w-3xl px-6 py-12 text-sm"><p>{loadError}</p><button type="button" className="mt-3 rounded border border-[var(--border)] px-3 py-2 hover:bg-[var(--muted)]" onClick={() => setRetry(value => value + 1)}>重试加载</button></div>
        ) : isLoading || !currentUser || loadedKey !== documentId ? (
          <div role="status" className="mx-auto w-full max-w-3xl px-6 py-12 text-sm text-[var(--muted-foreground)]">正在加载日志…</div>
        ) : <BlockEditor
          documentId={documentId}
          key={`${currentUser?.id}-${selectedDate}`}
          date={selectedDate}
          initialTitle={currentLog?.title || ''}
          initialContent={currentLog?.contentJson}
          initialTags={currentLog?.tags?.map((t) => t.tag.name) || []}
          initialMood={currentLog?.mood || '🚀'}
          onSave={handleSaveLog}
          isSaving={isSaving}
        />}
      </div>
    </div>
  );
}
