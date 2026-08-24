'use client';

import React, { useState } from 'react';
import { WorkLog } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/user-context';

interface CalendarViewProps {
  logs: WorkLog[];
  onSelectDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ logs, onSelectDate }) => {
  const { currentUser } = useCurrentUser();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month & days in month
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Map logs by date string
  const logsByDate: Record<string, WorkLog[]> = {};
  for (const log of logs) {
    if (!logsByDate[log.date]) {
      logsByDate[log.date] = [];
    }
    logsByDate[log.date].push(log);
  }

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const paddingArray = Array.from({ length: (firstDay + 6) % 7 }, (_, i) => i); // Monday first

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-7 shadow-xs">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {year} 年 {month + 1} 月 工作日志时间线
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              点击任意日期可快速定位、补填或查阅当天的日志详情
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition"
          >
            今天
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2.5 text-center text-sm font-bold text-slate-400 mb-3">
        <span>周一</span>
        <span>周二</span>
        <span>周三</span>
        <span>周四</span>
        <span>周五</span>
        <span className="text-emerald-600 dark:text-emerald-400">周六</span>
        <span className="text-emerald-600 dark:text-emerald-400">周日</span>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-2.5">
        {paddingArray.map((p) => (
          <div
            key={`pad-${p}`}
            className="min-h-[110px] p-2.5 bg-slate-50/40 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200/50 dark:border-slate-800"
          />
        ))}

        {daysArray.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const dayLogs = logsByDate[dateStr] || [];
          const hasBlocker = dayLogs.some((l) => l.hasBlocker);

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[110px] p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isToday
                  ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day}
                </span>

                {hasBlocker && (
                  <span title="包含阻塞卡点">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </span>
                )}
              </div>

              {/* Badges / Avatars of submitted members */}
              <div className="flex flex-col gap-1.5 mt-1.5">
                {dayLogs.slice(0, 2).map((l) => (
                  <div
                    key={l.id}
                    className="text-xs font-medium truncate px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <span>{l.mood || '📝'}</span>
                    <span className="truncate">{l.user?.name || l.title || '已写日志'}</span>
                  </div>
                ))}
                {dayLogs.length > 2 && (
                  <span className="text-xs text-slate-400 pl-1 font-medium">
                    +{dayLogs.length - 2} 位成员
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

