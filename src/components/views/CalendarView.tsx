'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { WorkLog } from '@/types';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface CalendarViewProps { logs: WorkLog[]; onSelectDate: (dateStr: string) => void; }

export const CalendarView: React.FC<CalendarViewProps> = ({ logs, onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const logsByDate: Record<string, WorkLog[]> = {};
  for (const log of logs) {
    if (!logsByDate[log.date]) logsByDate[log.date] = [];
    logsByDate[log.date].push(log);
  }
  const daysArray = Array.from({ length: totalDays }, (_, index) => index + 1);
  const paddingArray = Array.from({ length: (firstDay + 6) % 7 }, (_, index) => index);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return <section aria-label="工作日志日历">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-xl font-semibold">日志日历</h1><p className="mt-1.5 text-sm text-[var(--muted-foreground)]">按日期回顾团队进展，选择一天查看或补写日志。</p></div>
      <div className="flex items-center gap-1"><button type="button" aria-label="上个月" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="icon-button"><ChevronLeft size={16} /></button><span aria-live="polite" className="min-w-24 text-center text-sm">{year} 年 {month + 1} 月</span><button type="button" aria-label="下个月" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="icon-button"><ChevronRight size={16} /></button><button type="button" onClick={() => setCurrentDate(new Date())} className="quiet-button ml-1 px-2 py-2 text-xs">本月</button></div>
    </div>
    <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-[var(--muted-foreground)] sm:gap-2">{['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(day => <span key={day} className="py-2">{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {paddingArray.map(index => <div key={`pad-${index}`} aria-hidden="true" className="min-h-20 rounded bg-[var(--muted)] sm:min-h-[110px]" />)}
      {daysArray.map(day => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayLogs = logsByDate[dateStr] || [];
        const hasBlocker = dayLogs.some(log => log.hasBlocker);
        return <button key={dateStr} type="button" onClick={() => onSelectDate(dateStr)} aria-label={`${dateStr}${isToday ? '，今天' : ''}，${dayLogs.length} 条日志${hasBlocker ? '，包含阻塞点' : ''}`} aria-current={isToday ? 'date' : undefined} className={`flex min-h-20 min-w-0 flex-col rounded border p-1.5 text-left transition-colors hover:bg-[var(--muted)] sm:min-h-[110px] sm:p-2.5 ${isToday ? 'border-[var(--accent)] bg-[var(--muted)]' : 'border-[var(--border)] bg-[var(--background)]'}`}>
          <span className="flex items-center justify-between gap-1"><span className={`flex h-6 w-6 items-center justify-center rounded text-xs ${isToday ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : ''}`}>{day}</span>{hasBlocker && <AlertTriangle size={12} aria-hidden="true" className="shrink-0 text-red-500" />}</span>
          {dayLogs.length > 0 && <span className="mt-auto pt-2 text-[10px] text-[var(--muted-foreground)] sm:hidden">{dayLogs.length} 条</span>}
          <span className="mt-2 hidden flex-col gap-1 sm:flex">{dayLogs.slice(0, 2).map(log => <span key={log.id} className="block truncate rounded bg-[var(--muted)] px-1.5 py-0.5 text-[11px]">{log.user?.name || log.title || '已写日志'}</span>)}{dayLogs.length > 2 && <span className="px-1 text-[11px] text-[var(--muted-foreground)]">+{dayLogs.length - 2} 条</span>}</span>
        </button>;
      })}
    </div>
  </section>;
};
