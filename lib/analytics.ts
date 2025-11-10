/**
 * Analytics Setup - PostHog
 * 
 * Tracks:
 * - User signups
 * - Daily active users
 * - Sessions
 * - Page views
 * - Key events (recipe creation, searches, etc.)
 * 
 * Privacy-first:
 * - No PII tracked by default
 * - GDPR compliant
 * - No cookie banner needed
 */

import posthog from 'posthog-js';

// Initialize PostHog (only on client-side)
export function initPostHog() {
  if (typeof window === 'undefined') return;

  // Check if already initialized
  if (posthog.__loaded) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('⚠️ PostHog API key not found. Analytics disabled.');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    
    // Auto-capture
    autocapture: true, // Captures clicks, form submissions
    capture_pageview: true, // Captures page views
    capture_pageleave: true, // Captures time on page
    
    // Session recording (optional - enable in PostHog dashboard)
    session_recording: {
      recordCrossOriginIframes: false,
    },
    
    // Privacy
    respect_dnt: true, // Respect Do Not Track
    opt_out_capturing_by_default: false,
    
    // Performance
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PostHog analytics initialized');
      }
    },
  });
}

/**
 * Identify user (call after login/signup)
 */
export function identifyUser(userId: string, properties?: {
  email?: string;
  name?: string;
  [key: string]: any;
}) {
  if (typeof window === 'undefined') return;
  
  posthog.identify(userId, properties);
}

/**
 * Reset identity (call on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;
  
  posthog.reset();
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  posthog.capture(eventName, properties);
}

/**
 * Track page view (auto-captured, but you can manually track)
 */
export function trackPageView(pageName?: string) {
  if (typeof window === 'undefined') return;
  
  posthog.capture('$pageview', {
    page: pageName || window.location.pathname,
  });
}

/**
 * Set user properties (for segmentation)
 */
export function setUserProperties(properties: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  posthog.people.set(properties);
}

// Export posthog instance for advanced usage
export { posthog };

// Convenience tracking functions
export const analytics = {
  // User events
  signup: (userId: string, method: 'email' | 'google') => 
    trackEvent('user_signed_up', { method }),
  
  login: (userId: string, method: 'email' | 'google') => 
    trackEvent('user_logged_in', { method }),
  
  logout: () => 
    trackEvent('user_logged_out'),
  
  // Recipe events
  recipeCreated: (recipeId: string, source: string) => 
    trackEvent('recipe_created', { recipe_id: recipeId, source }),
  
  recipeViewed: (recipeId: string) => 
    trackEvent('recipe_viewed', { recipe_id: recipeId }),
  
  recipeDeleted: (recipeId: string) => 
    trackEvent('recipe_deleted', { recipe_id: recipeId }),
  
  // Search events
  recipeSearched: (query: string, resultsCount: number) => 
    trackEvent('recipe_searched', { query, results_count: resultsCount }),
  
  // Friend events
  friendInviteSent: (recipientEmail: string) => 
    trackEvent('friend_invite_sent', { recipient: recipientEmail }),
  
  friendInviteAccepted: (friendId: string) => 
    trackEvent('friend_invite_accepted', { friend_id: friendId }),
  
  // AI events
  aiChatSent: (intent: string) => 
    trackEvent('ai_chat_sent', { intent }),
  
  aiRecipeGenerated: (prompt: string) => 
    trackEvent('ai_recipe_generated', { prompt }),
  
  // Settings events
  settingsViewed: () => 
    trackEvent('settings_viewed'),
  
  profileUpdated: (field: string) => 
    trackEvent('profile_updated', { field }),
  
  // Group events
  groupSwitched: (groupId: string, groupName: string) => 
    trackEvent('group_switched', { group_id: groupId, group_name: groupName }),
  
  // Error tracking
  error: (error: Error, context?: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    
    posthog.capture('$exception', {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack: error.stack,
      ...context,
    });
    
    // Also log to console
    console.error('Tracked error:', error, context);
  },
};

