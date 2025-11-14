'use client';

/**
 * Desktop Navigation Component
 * 
 * LinkedIn-style navigation with icon + text labels
 * Clean, unified approach for all nav items
 */

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  ButtonBase,
  Badge,
} from '@mui/material';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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

export default function DesktopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeGroup, groups, loading: groupsLoading, switchGroup } = useGroup();
  const { showToast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

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
      .channel('friend-requests')
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

  const count = pendingRequests.length;

  return (
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
          minHeight: 64,
          px: '0 !important',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: '1536px',
            mx: 'auto',
            px: 3,
          }}
        >
          {/* Logo */}
          <Box
            onClick={() => {
              const ownGroup = groups.find(g => g.isOwn);
              if (ownGroup) {
                switchGroup(ownGroup.id);
                router.push('/browse');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <img 
              src="/logo1.svg" 
              alt="RecipeAssist" 
              style={{ height: '40px', width: 'auto' }}
            />
          </Box>

          {/* Navigation Items - Left (Home/Friends) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', ml: 5 }}>
            {/* Home */}
            <ButtonBase
              onClick={handleHomeClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 1.5,
                py: 1,
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
              <Typography
                variant="body2"
                sx={{
                  fontSize: '14px',
                  color: (pathname === '/browse' && activeGroup?.isOwn) ? 'text.primary' : 'text.secondary',
                  fontWeight: (pathname === '/browse' && activeGroup?.isOwn) ? 600 : 400,
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
                  alignItems: 'center',
                  px: 1.5,
                  py: 1,
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
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '14px',
                    color: pathname === '/feed' ? 'text.primary' : 'text.secondary',
                    fontWeight: pathname === '/feed' ? 600 : 400,
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
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 1,
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
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '14px',
                    color: pathname === '/friends' ? 'text.primary' : 'text.secondary',
                    fontWeight: pathname === '/friends' ? 600 : 400,
                  }}
                >
                  Friends
                </Typography>
                {count > 0 && (
                  <Box
                    sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      borderRadius: '10px',
                      px: 0.75,
                      py: 0.25,
                      fontSize: '11px',
                      fontWeight: 600,
                      minWidth: '20px',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {count}
                  </Box>
                )}
              </ButtonBase>
            )}
          </Box>

          {/* Right Side - Search & User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
            {/* Friends Search */}
            {user && !groupsLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FriendsSearch />
              </Box>
            )}

            {/* User Menu */}
            {user && <UserAvatarMenu />}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
