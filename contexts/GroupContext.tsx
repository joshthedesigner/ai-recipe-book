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
 * Simplified GroupContext - no complex timeouts or race condition handling
 * Simply waits for user, loads groups, handles errors gracefully
 */
export function GroupProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Load groups for current user
  const loadGroups = useCallback(async (userId: string) => {
    try {
      console.log('GroupContext: Starting to load groups for user:', userId);
      setLoading(true);
      
      const startTime = Date.now();
      const userGroups = await getUserGroups(supabase, userId);
      const loadTime = Date.now() - startTime;
      
      console.log(`GroupContext: Loaded ${userGroups.length} groups in ${loadTime}ms`);
      
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

  // Track if we're currently loading to prevent duplicate loads
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Main effect: Load groups when user becomes available
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('GroupContext: Waiting for auth to load...');
      return;
    }

    // If no user after auth loads, clear state
    if (!user) {
      console.log('GroupContext: No user, clearing state');
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

    // User is available - load groups (only if not already loading)
    if (!isLoadingGroups) {
      console.log('GroupContext: User available, loading groups:', user.id);
      setIsLoadingGroups(true);
      loadGroups(user.id).finally(() => {
        setIsLoadingGroups(false);
      });
    }
  }, [user, authLoading, loadGroups, isLoadingGroups]);

  // Listen for auth state changes - this handles sign-in/sign-out
  // This is the PRIMARY way we detect sign-ins (since getSession() times out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('GroupContext: Auth state changed:', event, session?.user ? 'has user' : 'no user');
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          setGroups([]);
          setActiveGroup(null);
          setLoading(false);
          setIsLoadingGroups(false);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          // Reload groups when user signs in or session is restored
          // This is critical because getSession() times out in production
          if (!isLoadingGroups) {
            console.log('GroupContext: User signed in/restored, loading groups:', session.user.id);
            setIsLoadingGroups(true);
            await loadGroups(session.user.id).finally(() => {
              setIsLoadingGroups(false);
            });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadGroups, isLoadingGroups]);

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

