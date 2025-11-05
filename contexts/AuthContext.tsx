'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/db/supabaseClient';
import { useRouter } from 'next/navigation';
import { activatePendingInvites } from '@/utils/invites';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let sessionLoaded = false;

    // Safety timeout: if loading takes more than 5 seconds, force it to false
    timeoutId = setTimeout(() => {
      if (mounted && !sessionLoaded) {
        console.warn('AuthContext: Session loading timeout exceeded, setting loading to false');
        setLoading(false);
        sessionLoaded = true;
      }
    }, 5000);

    // Get initial session - important for page reload/navigation
    const initSession = async () => {
      try {
        console.log('AuthContext: Attempting to get session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('AuthContext: Error getting session:', error);
          if (timeoutId) clearTimeout(timeoutId);
          sessionLoaded = true;
          setLoading(false);
          return;
        }
        
        console.log('AuthContext: Session retrieved:', session ? 'valid' : 'null');
        setSession(session);
        setUser(session?.user ?? null);
        if (timeoutId) clearTimeout(timeoutId);
        sessionLoaded = true;
        setLoading(false);
      } catch (error) {
        console.error('AuthContext: Error initializing session:', error);
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          sessionLoaded = true;
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session ? 'session exists' : 'no session');
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (timeoutId) clearTimeout(timeoutId);
        sessionLoaded = true;
        setLoading(false);
        
        // Activate invites when user signs in (handles email confirmation)
        // Run non-blocking so it doesn't delay user experience
        if (event === 'SIGNED_IN' && session?.user) {
          activatePendingInvites(supabase, session.user.id, session.user.email || '')
            .then((result) => {
              if (result.activated > 0) {
                console.log(`Activated ${result.activated} pending invite(s) on sign-in`);
                // Trigger GroupContext refresh to pick up newly activated groups
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('groups-refresh'));
                }
              }
            })
            .catch((error) => {
              console.error('Error activating pending invites:', error);
            });
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Note: Pending invites are activated by the onAuthStateChange handler
      // No need to call activatePendingInvites here - it will be called automatically

      router.push('/browse');
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        return { error };
      }

      // Note: Pending invites are activated by the database trigger on signup
      // No need to call activatePendingInvites() here - trigger handles it

      // If email confirmation is disabled, sign them in
      if (data.user && data.session) {
        router.push('/browse');
        return { error: null, needsConfirmation: false };
      }

      // Email confirmation required
      return { error: null, needsConfirmation: true };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

