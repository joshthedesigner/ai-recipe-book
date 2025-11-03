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
      // Only access localStorage on client-side (after hydration)
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
        // Try to find the stored group in user's groups
        active = userGroups.find(g => g.id === storedGroupId) || null;
      }

      // If stored group not found or not set, default to owned group, then first group
      if (!active) {
        active = userGroups.find(g => g.isOwn) || userGroups[0] || null;
      }

      setActiveGroup(active);
      
      // Only update localStorage on client-side
      if (typeof window !== 'undefined') {
        try {
          if (active) {
            localStorage.setItem(STORAGE_KEY, active.id);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.warn('Error updating localStorage:', error);
        }
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
      // Only update localStorage on client-side
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, groupId);
        } catch (error) {
          console.warn('Error updating localStorage:', error);
        }
      }
    }
  };

  // Refresh groups list
  const refreshGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await loadGroups(user.id);
    }
  };

  // Initialize on mount - ensure we're on client-side
  useEffect(() => {
    // Only run on client-side (after hydration)
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        // Use getSession first to check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          if (mounted) {
            await loadGroups(session.user.id);
          }
        } else {
          // No session - check if we have a user anyway (might be stale)
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            if (mounted) {
              setGroups([]);
              setActiveGroup(null);
              setLoading(false);
            }
            return;
          }
          if (mounted) {
            await loadGroups(user.id);
          }
        }
      } catch (error) {
        console.error('Error initializing groups:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    // Listen for auth changes (login, logout, token refresh, session restore)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Handle different auth events
        if (event === 'SIGNED_OUT' || !session?.user) {
          setGroups([]);
          setActiveGroup(null);
          // Only update localStorage on client-side
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // User signed in or session refreshed - reload groups
          if (session?.user) {
            await loadGroups(session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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

