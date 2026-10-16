'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek } from 'date-fns';
import { useCurrentUser } from '@/lib/user-context';
import { Copy, Download, Check, X, FileText } from 'lucide-react';

interface WeeklySummaryModalProps { isOpen: boolean; onClose: () => void; }

export const WeeklySummaryModal: React.FC<WeeklySummaryModalProps> = ({ isOpen, onClose }) => {
  const { teams } = useCurrentUser();
  const [teamFilter, setTeamFilter] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyboard); previousFocus?.focus(); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setCopied(false);
    setError(null);
    if (!startDate || !endDate || startDate > endDate) { setError('请选择有效的起止日期，结束日期应晚于或等于开始日期。'); setMarkdown(''); setIsLoading(false); return; }
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ startDate, endDate });
        if (teamFilter) params.set('teamId', teamFilter);
        const response = await fetch(`/api/summary?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error('周报加载失败，请检查服务与数据库后重试。');
        const data = await response.json();
        if (!controller.signal.aborted) setMarkdown(data.markdown);
      } catch (cause) {
        if (!controller.signal.aborted) { setMarkdown(''); setError(cause instanceof Error ? cause.message : '周报加载失败。'); }
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    };
    void fetchSummary();
    return () => controller.abort();
  }, [isOpen, startDate, endDate, teamFilter]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('复制失败，请手动选择周报文本复制。'); }
  };
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Minework_Weekly_Report_${startDate}_${endDate}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="weekly-summary-title" aria-describedby="weekly-summary-description" className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
        <div><h2 id="weekly-summary-title" className="flex items-center gap-2 text-base font-semibold"><FileText size={17} aria-hidden="true" />工作周报</h2><p id="weekly-summary-description" className="mt-1.5 text-xs text-[var(--muted-foreground)]">汇集所选日期与团队的日志，复制或导出为 Markdown。</p></div>
        <button type="button" onClick={onClose} aria-label="关闭周报" className="icon-button shrink-0"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b border-[var(--border)] bg-[var(--muted)] px-4 py-4 text-xs sm:grid-cols-3 sm:px-6">
        <label className="flex min-w-0 flex-col gap-1.5 text-[var(--muted-foreground)]">开始日期<input type="date" value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} className="h-9 min-w-0 w-full rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs text-[var(--foreground)]" /></label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[var(--muted-foreground)]">结束日期<input type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} className="h-9 min-w-0 w-full rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs text-[var(--foreground)]" /></label>
        <label className="col-span-2 flex min-w-0 flex-col gap-1.5 text-[var(--muted-foreground)] sm:col-span-1">团队<select value={teamFilter} onChange={event => setTeamFilter(event.target.value)} className="h-9 w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)]"><option value="">全部团队</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      </div>
      <div className="min-h-40 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
        {isLoading ? <p role="status" className="py-12 text-center text-sm text-[var(--muted-foreground)]">正在汇集日志…</p> : <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[var(--foreground)]">{markdown}</pre>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:px-6">
        <span className="text-xs text-[var(--muted-foreground)]">Markdown 格式</span>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleCopy} disabled={isLoading || !markdown} className="primary-button disabled:opacity-50">{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}<span>{copied ? '已复制' : '复制周报'}</span></button>
          <button type="button" onClick={handleDownload} disabled={isLoading || !markdown} className="quiet-button rounded border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-50"><Download size={14} aria-hidden="true" />下载 .md</button>
        </div>
      </div>
    </div>
  </div>;
};
