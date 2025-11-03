'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/db/supabaseClient';
import { getUserGroups } from '@/utils/permissions';
import { UserRole } from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  role: UserRole;
  isOwn: boolean;
}

interface GroupContextType {
  activeGroup: Group | null;
  groups: Group[];
  loading: boolean;
  switchGroup: (groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

const STORAGE_KEY = 'activeGroupId';

/**
 * Simple GroupContext:
 * - Watches user from AuthContext
 * - Loads groups when user is available
 * - Clears groups when user is null
 * - No complex listeners, timeouts, or race conditions
 */
export function GroupProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Load groups for current user
  const loadGroups = useCallback(async (userId: string) => {
    try {
      console.log('GroupContext: Loading groups for user:', userId);
      setLoading(true);
      
      const startTime = Date.now();
      const userGroups = await getUserGroups(supabase, userId);
      const loadTime = Date.now() - startTime;
      
      console.log(`GroupContext: Loaded ${userGroups.length} groups in ${loadTime}ms`);
      
      setGroups(userGroups);

      // Get active group from localStorage or default to owned group
      let storedGroupId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          storedGroupId = localStorage.getItem(STORAGE_KEY);
        } catch (error) {
          console.warn('Error accessing localStorage:', error);
        }
      }

      let active: Group | null = null;
      if (storedGroupId) {
        active = userGroups.find(g => g.id === storedGroupId) || null;
      }
      if (!active) {
        active = userGroups.find(g => g.isOwn) || userGroups[0] || null;
      }

      setActiveGroup(active);
      
      if (typeof window !== 'undefined' && active) {
        try {
          localStorage.setItem(STORAGE_KEY, active.id);
        } catch (error) {
          console.warn('Error updating localStorage:', error);
        }
      }
      
      console.log('GroupContext: Active group set:', active ? active.name : 'none');
    } catch (error) {
      console.error('GroupContext: Error loading groups:', error);
      setGroups([]);
      setActiveGroup(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Switch active group
  const switchGroup = useCallback(async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setActiveGroup(group);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, groupId);
        } catch (error) {
          console.warn('Error updating localStorage:', error);
        }
      }
    }
  }, [groups]);

  // Refresh groups list
  const refreshGroups = useCallback(async () => {
    if (user) {
      await loadGroups(user.id);
    }
  }, [user, loadGroups]);

  // Single effect: Watch user from AuthContext and load groups accordingly
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // No user - clear state
    if (!user) {
      setGroups([]);
      setActiveGroup(null);
      setLoading(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.warn('Error removing from localStorage:', error);
        }
      }
      return;
    }

    // User is available - load groups
    loadGroups(user.id);
  }, [user, authLoading, loadGroups]);

  return (
    <GroupContext.Provider
      value={{
        activeGroup,
        groups,
        loading,
        switchGroup,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
