'use client';

import React, { useState } from 'react';
import { useCurrentUser } from '@/lib/user-context';
import { User } from '@/types';
import {
  FileText,
  Users,
  Search,
  Sparkles,
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  Briefcase,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { WeeklySummaryModal } from '../views/WeeklySummaryModal';

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    isSidebarCollapsed,
    toggleSidebar,
  } = useCurrentUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-15 px-4 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        {/* Brand & Team Switcher */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isSidebarCollapsed ? '展开导航侧边栏' : '收起导航侧边栏'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-base shadow-sm shadow-emerald-500/20">
              F
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Feedmob WorkLog</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">
                  极简版
                </span>
              </div>
            </div>
          </div>


          {/* Department Filter (Only if teams exist) */}
          {teams.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-sm">
              <button
                type="button"
                onClick={() => setSelectedTeamId(null)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedTeamId === null
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                全团队
              </button>
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedTeamId === t.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search & Action Bar */}
        <div className="flex items-center gap-3.5">
          {/* Quick Search */}
          <div className="relative w-52 lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索日志、成员、卡点..."
              className="w-full text-sm pl-9 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Export Weekly Summary Button */}
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>一键生成周报</span>
          </button>

          {/* Current User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                {currentUser?.name?.[0] || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser?.name || '当前用户'}
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  {currentUser?.title || '个人工作区'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    用户空间设置
                  </div>
                  <span className="text-xs text-emerald-600 font-bold">已连接本地库</span>
                </div>

                {/* Current User Quick Edit */}
                {currentUser && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-2 flex flex-col gap-2">
                    <div className="text-xs text-slate-500 font-medium">当前昵称 / 显示名：</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={currentUser.name}
                        onBlur={async (e) => {
                          const newName = e.target.value.trim();
                          if (newName && newName !== currentUser.name) {
                            try {
                              const res = await fetch('/api/users', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: currentUser.id, name: newName }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setCurrentUser(updated);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        placeholder="输入您的昵称..."
                        className="flex-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Other Users List (if multiple) */}
                {users.length > 1 && (
                  <div className="py-1 flex flex-col gap-1">
                    <div className="text-xs text-slate-400 px-2 py-1">切换其他成员：</div>
                    {users
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setCurrentUser(u);
                            setIsUserMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">
                            {u.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{u.name}</div>
                            <div className="text-xs text-slate-400 truncate">{u.title || '成员'}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>



      {/* Weekly Summary Modal */}
      <WeeklySummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
    </>
  );
};
