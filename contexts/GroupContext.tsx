'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
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

export function GroupProvider({ children }: { children: ReactNode }) {
  // Use AuthContext instead of calling getSession/getUser independently
  // This eliminates race conditions and ensures coordination
  const { user, loading: authLoading } = useAuth();
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

  // Refresh groups list - use AuthContext user instead of calling getUser
  const refreshGroups = async () => {
    if (user) {
      await loadGroups(user.id);
    }
  };

  // Load groups when user becomes available from AuthContext
  // This eliminates race conditions - we wait for AuthContext to finish loading
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Safety timeout: if loading takes more than 10 seconds, force it to false
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('GroupContext: Loading timeout exceeded, setting loading to false');
        setLoading(false);
      }
    }, 10000);

    const loadGroupsForUser = async () => {
      // Wait for AuthContext to finish loading
      if (authLoading) {
        console.log('GroupContext: Waiting for AuthContext to finish loading...');
        return;
      }

      // If no user, clear state
      if (!user) {
        if (mounted) {
          setGroups([]);
          setActiveGroup(null);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
          setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
        return;
      }

      // User is available - load groups
      if (mounted) {
        try {
          await loadGroups(user.id);
        } catch (error) {
          console.error('Error loading groups:', error);
          if (mounted) {
            setLoading(false);
          }
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    };

    loadGroupsForUser();

    // Also listen for auth state changes as a backup
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Handle different auth events
        if (event === 'SIGNED_OUT' || !session?.user) {
          setGroups([]);
          setActiveGroup(null);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          // User signed in, session refreshed, or initial session restored - reload groups
          if (session?.user && mounted) {
            await loadGroups(session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [user, authLoading]); // Depend on AuthContext user and loading state

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

