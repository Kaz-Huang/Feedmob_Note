'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PenSquare,
  Activity,
  Calendar,
  Hash,
  PanelLeftClose,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/user-context';


export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, teams, isSidebarCollapsed, toggleSidebar } = useCurrentUser();

  const navItems = [
    {
      label: '今日速填 (Today)',
      href: '/',
      icon: PenSquare,
      description: '记录与提交当天日志',
    },
    {
      label: '团队时序流 (Stream)',
      href: '/stream',
      icon: Activity,
      description: '实时聚合团队动态与卡点',
    },
    {
      label: '时间线日历 (Timeline)',
      href: '/calendar',
      icon: Calendar,
      description: '按月按周回溯与补填',
    },
    {
      label: '标签矩阵 (Matrix)',
      href: '/tags',
      icon: Hash,
      description: '跨人跨周期项目追踪',
    },
  ];

  if (isSidebarCollapsed) {
    return null;
  }

  return (
    <aside className="w-64 lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-[calc(100vh-4rem)] transition-all duration-200">
      <div className="flex flex-col gap-6">
        {/* Sidebar Header with Collapse Button */}
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            多维视图导航
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title="收起侧边栏 (Alt+\ 或点击)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Teams List (if any) */}
        {teams.length > 0 && (
          <div>
            <div className="px-2 mb-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              业务与研发小组
            </div>
            <div className="flex flex-col gap-1">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color || '#3b82f6' }}
                    />
                    <span>{t.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">活跃</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </aside>
  );
};


