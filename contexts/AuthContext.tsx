'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/db/supabaseClient';
import { useRouter } from 'next/navigation';

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
  
  // Track last auth state to prevent duplicate updates
  const lastUserId = useRef<string | null>(null);
  const lastAccessToken = useRef<string | null>(null);
  
  // Helper to check if auth state actually changed
  const shouldUpdateAuth = (session: Session | null): boolean => {
    const newUserId = session?.user?.id ?? null;
    const newAccessToken = session?.access_token ?? null;
    
    return (
      newUserId !== lastUserId.current || 
      newAccessToken !== lastAccessToken.current
    );
  };
  
  // Helper to update auth state and tracking refs
  const updateAuthState = (session: Session | null) => {
    lastUserId.current = session?.user?.id ?? null;
    lastAccessToken.current = session?.access_token ?? null;
    setSession(session);
    setUser(session?.user ?? null);
  };

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
        
        if (shouldUpdateAuth(session)) {
          updateAuthState(session);
        } else {
          console.log('AuthContext: Skipping duplicate auth update (same user and token)');
        }
        
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
    // Filter events to only process meaningful changes
    const RELEVANT_EVENTS = ['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED'];
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session ? 'session exists' : 'no session');
      
      // Filter out irrelevant events (like INITIAL_SESSION duplicate)
      if (!RELEVANT_EVENTS.includes(event)) {
        console.log(`AuthContext: Ignoring ${event} event to prevent duplicate updates`);
        return;
      }
      
      if (mounted) {
        // Only update state if user ID or access token changed
        if (shouldUpdateAuth(session)) {
          updateAuthState(session);
        } else {
          console.log('AuthContext: Skipping duplicate auth update (same user and token)');
        }
        
        if (timeoutId) clearTimeout(timeoutId);
        sessionLoaded = true;
        setLoading(false);
        
        // Note: Friends feature handles invites separately via friend_invite query param
      }
    });

    return () => {
      mounted = false;
      lastUserId.current = null;
      lastAccessToken.current = null;
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
    router.push('/');
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

