'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PenSquare,
  Activity,
  Calendar,
  Hash,
  Sparkles,
  Users,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/user-context';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, teams } = useCurrentUser();

  const navItems = [
    {
      label: '今日速填 (Today)',
      href: '/',
      icon: PenSquare,
      description: '记录与提交当天日志',
    },
    {
      label: '团队时序大盘 (Stream)',
      href: '/stream',
      icon: Activity,
      description: '实时聚合团队动态与卡点',
    },
    {
      label: '时间线与日历 (Timeline)',
      href: '/calendar',
      icon: Calendar,
      description: '按月按周回溯与补填',
    },
    {
      label: '标签与项目透视 (Matrix)',
      href: '/tags',
      icon: Hash,
      description: '跨人跨周期项目追踪',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between p-4 shrink-0 hidden md:flex min-h-[calc(100vh-3.5rem)]">
      <div className="flex flex-col gap-6">
        {/* Navigation Group */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            多维视图投影
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Teams List */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            业务与研发小组
          </div>
          <div className="flex flex-col gap-1">
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.color || '#3b82f6' }}
                  />
                  <span>{t.name}</span>
                </div>
                <span className="text-[10px] text-slate-400">活跃</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info Card */}
      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs mb-1">
          <Shield className="w-3.5 h-3.5" />
          <span>Notion 蒸馏内核</span>
        </div>
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400/90 leading-relaxed">
          极速 Block 键盘流 + 零拷贝时序投影。内网本地私有化，100% 数据主权。
        </p>
      </div>
    </aside>
  );
};
