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
} from 'lucide-react';
import { WeeklySummaryModal } from '../views/WeeklySummaryModal';

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const { currentUser, users, setCurrentUser, teams, selectedTeamId, setSelectedTeamId } = useCurrentUser();
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
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        {/* Brand & Team Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              F
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Feedmob WorkLog</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded">
                  极简版
                </span>
              </div>
            </div>
          </div>

          {/* Department Filter */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedTeamId === null
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              全团队
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedTeamId === t.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Global Search & Action Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-48 lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索日志、成员、卡点..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Export Weekly Summary Button */}
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>一键生成周报</span>
          </button>

          {/* Current User Profile Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {currentUser?.name?.[0] || 'U'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser?.name}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {currentUser?.team?.name || currentUser?.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    切换当前登录成员
                  </div>
                </div>

                <div className="py-1 flex flex-col gap-0.5">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setCurrentUser(u);
                        setIsUserMenuOpen(false);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition ${
                        currentUser?.id === u.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold">
                          {u.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center justify-between">
                          <span>{u.name}</span>
                          <span className="text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.title || u.team?.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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
