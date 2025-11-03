'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/db/supabaseClient';
import { getUserGroups } from '@/utils/permissions';
import { UserRole } from '@/utils/permissions';

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

export function GroupProvider({ children }: { children: ReactNode }) {
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Load groups for current user
  const loadGroups = async (userId: string) => {
    try {
      setLoading(true);
      const userGroups = await getUserGroups(supabase, userId);
      setGroups(userGroups);

      // Get active group from localStorage or default to owned group
      const storedGroupId = localStorage.getItem(STORAGE_KEY);
      let active: Group | null = null;

      if (storedGroupId) {
        // Try to find the stored group in user's groups
        active = userGroups.find(g => g.id === storedGroupId) || null;
      }

      // If stored group not found or not set, default to owned group, then first group
      if (!active) {
        active = userGroups.find(g => g.isOwn) || userGroups[0] || null;
      }

      setActiveGroup(active);
      if (active) {
        localStorage.setItem(STORAGE_KEY, active.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Switch active group
  const switchGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setActiveGroup(group);
      localStorage.setItem(STORAGE_KEY, groupId);
    }
  };

  // Refresh groups list
  const refreshGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadGroups(user.id);
    }
  };

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadGroups(user.id);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadGroups(session.user.id);
        } else {
          setGroups([]);
          setActiveGroup(null);
          localStorage.removeItem(STORAGE_KEY);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

