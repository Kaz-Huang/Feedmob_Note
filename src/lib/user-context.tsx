'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Team } from '@/types';

interface UserContextType {
  currentUser: User | null;
  users: User[];
  teams: Team[];
  setCurrentUser: (user: User) => void;
  selectedTeamId: string | null;
  setSelectedTeamId: (teamId: string | null) => void;
  refreshUsers: () => Promise<void>;
  isLoading: boolean;
  loadError: string | null;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  isFullWidth: boolean;
  toggleFullWidth: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);

  useEffect(() => {
    try {
      setIsSidebarCollapsed(localStorage.getItem('feedmob_sidebar_collapsed') === 'true');
      setIsFullWidth(localStorage.getItem('feedmob_editor_full_width') === 'true');
    } catch { /* Preferences are optional when browser storage is disabled. */ }
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMobileSidebarOpen(prev => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('feedmob_sidebar_collapsed', String(next)); } catch {}
      }
      return next;
    });
  };

  const toggleFullWidth = () => {
    setIsFullWidth((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('feedmob_editor_full_width', String(next)); } catch {}
      }
      return next;
    });
  };

  const fetchUsersAndTeams = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/teams'),
      ]);

      if (!usersRes.ok || !teamsRes.ok) throw new Error('无法读取工作区成员与团队，请检查服务和数据库后重试。');
      const meRes = await fetch('/api/me');
      const me = meRes.ok ? await meRes.json() : null;
      const authenticatedUser = me && typeof me.id === 'string' && typeof me.email === 'string' ? me as User : null;
      if (process.env.NODE_ENV === 'production' && !authenticatedUser) throw new Error('无法读取当前登录账号，请重新登录或重试。');
      {
        const usersData = await usersRes.json();
        const teamsData = await teamsRes.json();
        if (!Array.isArray(usersData) || !Array.isArray(teamsData)) throw new Error('工作区数据格式异常，请重试。');
        setUsers(usersData);
        setTeams(teamsData);

        // The Google account owns the default workspace. Keep the original
        // local fallback for development, where no OAuth session is configured.
        let savedUserId: string | null = null;
        try { savedUserId = localStorage.getItem('feedmob_active_user_id'); } catch {}
        const matched = usersData.find((u: User) => u.id === savedUserId);
        if (authenticatedUser) {
          setCurrentUser(authenticatedUser);
          if (!usersData.some((user: User) => user.id === authenticatedUser.id)) setUsers([...usersData, authenticatedUser]);
        } else if (matched) {
          setCurrentUser(matched);
        } else if (usersData.length > 0) {
          setCurrentUser(usersData[0]);
        } else {
          setCurrentUser(null);
          setLoadError('工作区还没有成员，请先配置用户。');
        }
      }
    } catch (err) {
      console.error('Failed to load users/teams', err);
      setLoadError(err instanceof Error ? err.message : '工作区加载失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndTeams();
  }, []);

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    setUsers(prev => prev.map(item => item.id === user.id ? user : item));
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('feedmob_active_user_id', user.id); } catch {}
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        teams,
        setCurrentUser: handleSetCurrentUser,
        selectedTeamId,
        setSelectedTeamId,
        refreshUsers: fetchUsersAndTeams,
        isLoading,
        loadError,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
        isFullWidth,
        toggleFullWidth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}


export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}
