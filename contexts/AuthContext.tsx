'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/db/supabaseClient';
import { useRouter } from 'next/navigation';
import { identifyUser, resetUser, analytics } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TEST 8: Track provider mount count (module scope - persists across renders)
let providerMountCount = 0;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Feature flag for metadata sync (can disable if issues occur)
  const ENABLE_METADATA_SYNC = 
    process.env.NEXT_PUBLIC_ENABLE_METADATA_SYNC === 'true'; // Default: disabled for safety
  
  // Track last auth state to prevent duplicate updates
  const lastUserId = useRef<string | null>(null);
  const lastAccessToken = useRef<string | null>(null);
  
  // Track metadata for profile updates (name, avatar)
  const lastMetadata = useRef<{
    name?: string;
    avatar_url?: string;
  } | null>(null);
  
  // Circuit breaker: Prevent runaway updates
  const updateCount = useRef(0);
  const lastResetTime = useRef(Date.now());
  
  // Helper to check if auth state actually changed
  const shouldUpdateAuth = (session: Session | null): boolean => {
    // Circuit breaker: Reset counter every second
    const now = Date.now();
    if (now - lastResetTime.current > 1000) {
      updateCount.current = 0;
      lastResetTime.current = now;
    }
    
    // Circuit breaker: Check if updating too frequently
    updateCount.current++;
    if (updateCount.current > 5) {
      console.error('🚨 CIRCUIT BREAKER: Too many auth updates (>5/second)', {
        count: updateCount.current,
        disablingMetadataSync: ENABLE_METADATA_SYNC,
      });
      return false; // Stop the loop
    }
    
    const newUserId = session?.user?.id ?? null;
    const newAccessToken = session?.access_token ?? null;
    
    // Critical changes: user ID or access token (login, logout, token refresh)
    const userIdChanged = newUserId !== lastUserId.current;
    const tokenChanged = newAccessToken !== lastAccessToken.current;
    
    if (userIdChanged || tokenChanged) {
      return true;
    }
    
    // Metadata changes: name, avatar (profile updates)
    if (ENABLE_METADATA_SYNC) {
      const newName = session?.user?.user_metadata?.name;
      const newAvatar = session?.user?.user_metadata?.avatar_url;
      
      // Compare primitive values (strings)
      const nameChanged = lastMetadata.current?.name !== newName;
      const avatarChanged = lastMetadata.current?.avatar_url !== newAvatar;
      
      if (nameChanged || avatarChanged) {
        // CRITICAL: Store metadata ATOMICALLY (before returning)
        // This ensures subsequent checks (of 7+ events) see the stored value
        lastMetadata.current = {
          name: newName,
          avatar_url: newAvatar,
        };
        
        return true;
      }
    }
    
    return false;
  };
  
  // Helper to update auth state and tracking refs
  const updateAuthState = (session: Session | null) => {
    lastUserId.current = session?.user?.id ?? null;
    lastAccessToken.current = session?.access_token ?? null;
    setSession(session);
    setUser(session?.user ?? null);
    
    // Identify user in analytics
    if (session?.user) {
      identifyUser(session.user.id, {
        email: session.user.email,
        name: session.user.user_metadata?.name,
      });
    } else {
      resetUser();
    }
  };

  useEffect(() => {
    // TEST 8: Track mount/unmount
    providerMountCount++;
    console.log(`🏗️ AuthProvider MOUNTED (total mounts in session: ${providerMountCount})`);
    
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
    
    // TEST 7: Track event details and timing
    const eventLog: Array<{ event: string; timestamp: number; tokenPrefix: string }> = [];
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const timestamp = Date.now();
      const tokenPrefix = session?.access_token?.slice(0, 20) || 'no-token';
      
      // Calculate gap from previous event
      const previousEvent = eventLog[eventLog.length - 1];
      const gap = previousEvent ? timestamp - previousEvent.timestamp : 0;
      
      eventLog.push({ event, timestamp, tokenPrefix });
      
      // TEST 7: Detailed event logging
      console.log('🔔 AUTH EVENT', {
        eventType: event,
        eventNumber: eventLog.filter(e => e.event === event).length,
        totalEvents: eventLog.length,
        gapFromPrevious: `${gap}ms`,
        hasSession: !!session,
        userId: session?.user?.id?.slice(0, 8),
        userName: session?.user?.user_metadata?.name,
        tokenPrefix: tokenPrefix,
        sameTokenAsPrevious: previousEvent?.tokenPrefix === tokenPrefix,
      });
      
      console.log('AuthContext: Auth state changed:', event, session ? 'session exists' : 'no session');
      
      // Filter out irrelevant events (like INITIAL_SESSION duplicate)        
        if (!RELEVANT_EVENTS.includes(event)) {
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
      lastMetadata.current = null;
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

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    analytics.logout();
    await supabase.auth.signOut();
    router.push('/');
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
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

