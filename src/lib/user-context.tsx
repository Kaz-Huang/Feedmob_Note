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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsersAndTeams = async () => {
    try {
      setIsLoading(true);
      const [usersRes, teamsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/teams'),
      ]);

      if (usersRes.ok && teamsRes.ok) {
        const usersData = await usersRes.json();
        const teamsData = await teamsRes.json();
        setUsers(usersData);
        setTeams(teamsData);

        // Restore saved user or default to first user (Alex Chen)
        const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('feedmob_active_user_id') : null;
        const matched = usersData.find((u: User) => u.id === savedUserId);
        if (matched) {
          setCurrentUser(matched);
        } else if (usersData.length > 0) {
          setCurrentUser(usersData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load users/teams', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndTeams();
  }, []);

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('feedmob_active_user_id', user.id);
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
