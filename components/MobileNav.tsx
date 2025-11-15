'use client';

/**
 * Mobile Navigation Component
 * 
 * LinkedIn-style navigation with icon + text labels
 * Includes expanding search pattern for mobile
 */

import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  ButtonBase,
  Typography,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import PeopleIcon from '@mui/icons-material/People';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/db/supabaseClient';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';

interface PendingRequest {
  id: string;
  senderName: string;
  senderEmail: string;
  invitedAt: string;
}

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeGroup, groups, loading: groupsLoading, switchGroup } = useGroup();
  const { showToast } = useToast();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);

  const handleSearchExpand = () => setSearchExpanded(true);
  const handleSearchCollapse = () => setSearchExpanded(false);

  const handleHomeClick = () => {
    const ownGroup = groups.find(g => g.isOwn);
    if (ownGroup) {
      switchGroup(ownGroup.id);
    }
    router.push('/browse');
  };

  // Load pending requests
  const loadPendingRequests = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/friends/list');
      const data = await response.json();

      if (data.success) {
        setPendingRequests(data.pendingIncoming || []);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  // Initial load
  useEffect(() => {
    loadPendingRequests();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('friend-requests-mobile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `invited_email=eq.${user.email.toLowerCase()}`,
        },
        () => {
          loadPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  // Load feed unread count
  const loadFeedUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/feed/unread-count');
      const data = await response.json();

      if (data.success) {
        setFeedUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading feed unread count:', error);
    }
  };

  // Initial load of feed unread count
  useEffect(() => {
    loadFeedUnreadCount();
  }, [user]);

  // Poll for feed updates every 30 seconds (skip if on feed page)
  useEffect(() => {
    if (!user || pathname === '/feed') return;

    const interval = setInterval(() => {
      loadFeedUnreadCount();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user, pathname]);

  // Mark feed as viewed immediately when navigating to feed page
  useEffect(() => {
    if (pathname === '/feed' && user) {
      // Mark as viewed immediately when user navigates to feed
      fetch('/api/feed/mark-viewed', { method: 'POST' })
        .then(() => {
          loadFeedUnreadCount(); // Refresh count immediately to hide badge
        })
        .catch((error) => {
          console.error('Error marking feed as viewed:', error);
        });
    }
  }, [pathname, user]);

  // Refresh unread count when leaving feed page or when feed is marked as viewed
  useEffect(() => {
    if (!user) return;

    const handleFeedViewed = () => {
      loadFeedUnreadCount();
    };

    // Listen for feed viewed event (backup from feed page scroll handler)
    window.addEventListener('feedViewed', handleFeedViewed);

    // Refresh count when user navigates away from feed
    if (pathname !== '/feed') {
      loadFeedUnreadCount();
    }

    return () => {
      window.removeEventListener('feedViewed', handleFeedViewed);
    };
  }, [pathname, user]);

  const count = pendingRequests.length;

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <Toolbar 
          sx={{ 
            minHeight: 56,
            px: '0 !important',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              px: 2,
            }}
          >
            {searchExpanded ? (
              /* EXPANDED: Back button + Full-width search */
              <>
                <IconButton 
                  onClick={handleSearchCollapse}
                  edge="start"
                  sx={{ mr: 1 }}
                >
                  <ArrowBackIcon />
                </IconButton>
                
                <Box sx={{ flex: 1 }}>
                  <FriendsSearch 
                    autoFocus
                    fullWidth
                    onSelect={handleSearchCollapse}
                  />
                </Box>
              </>
            ) : (
              /* COLLAPSED: Nav Items */
              <>
                {/* Navigation Items - Left (Home/Friends) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Home */}
                  <ButtonBase
                    onClick={handleHomeClick}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.25,
                      p: 0.75,
                      borderRadius: 1,
                      position: 'relative',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      // Selected state indicator - only when on /browse AND viewing own cookbook
                      '&::after': (pathname === '/browse' && activeGroup?.isOwn) ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '80%',
                        height: '3px',
                        bgcolor: 'text.primary',
                        borderRadius: '2px 2px 0 0',
                      } : {},
                    }}
                  >
                    <HomeIcon 
                      sx={{ 
                        fontSize: 20, 
                        color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary'
                      }} 
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '10px',
                        color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
                        fontWeight: (pathname === '/browse' && activeGroup?.isOwn) ? 600 : 400,
                        lineHeight: 1,
                      }}
                    >
                      Your Recipes
                    </Typography>
                  </ButtonBase>

                  {/* Feed */}
                  {user && (
                    <ButtonBase
                      onClick={() => router.push('/feed')}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.25,
                        p: 0.75,
                        borderRadius: 1,
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        // Selected state indicator
                        '&::after': pathname === '/feed' ? {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '80%',
                          height: '3px',
                          bgcolor: 'text.primary',
                          borderRadius: '2px 2px 0 0',
                        } : {},
                      }}
                    >
                      <Badge
                        badgeContent={feedUnreadCount}
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '9px',
                            height: '16px',
                            minWidth: '16px',
                          },
                        }}
                      >
                        <DynamicFeedIcon 
                          sx={{ 
                            fontSize: 20, 
                            color: pathname === '/feed' ? 'text.primary' : 'text.secondary'
                          }} 
                        />
                      </Badge>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '10px',
                          color: pathname === '/feed' ? 'text.primary' : 'text.secondary',
                          fontWeight: pathname === '/feed' ? 600 : 400,
                          lineHeight: 1,
                        }}
                      >
                        Feed
                      </Typography>
                    </ButtonBase>
                  )}

                  {/* Friends */}
                  {user && (
                    <ButtonBase
                      onClick={() => router.push('/friends')}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.25,
                          p: 0.75,
                          borderRadius: 1,
                          position: 'relative',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          // Selected state indicator
                          '&::after': pathname === '/friends' ? {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '80%',
                            height: '3px',
                            bgcolor: 'text.primary',
                            borderRadius: '2px 2px 0 0',
                          } : {},
                        }}
                      >
                        <Badge
                          badgeContent={count}
                          color="error"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '9px',
                              height: '16px',
                              minWidth: '16px',
                            },
                          }}
                        >
                          <PeopleIcon 
                            sx={{ 
                              fontSize: 20, 
                              color: pathname === '/friends' ? 'text.primary' : 'text.secondary'
                            }} 
                          />
                        </Badge>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '10px',
                            color: pathname === '/friends' ? 'text.primary' : 'text.secondary',
                            fontWeight: pathname === '/friends' ? 600 : 400,
                            lineHeight: 1,
                          }}
                        >
                          Friends
                        </Typography>
                      </ButtonBase>
                  )}
                </Box>

                {/* Right Side - Search & User */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', ml: 'auto' }}>
                  {/* Search */}
                  {user && !groupsLoading && (
                    <ButtonBase
                      onClick={handleSearchExpand}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.25,
                        p: 0.75,
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '10px',
                          color: 'text.secondary',
                          lineHeight: 1,
                        }}
                      >
                        Search Friends
                      </Typography>
                    </ButtonBase>
                  )}

                  {/* User Menu */}
                  {user && <UserAvatarMenu />}
                </Box>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Backdrop */}
      {searchExpanded && (
        <Box
          onClick={handleSearchCollapse}
          sx={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1200,
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
      )}
    </>
  );
}
