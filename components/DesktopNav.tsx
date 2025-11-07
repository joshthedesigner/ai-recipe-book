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
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';

export default function DesktopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loading: groupsLoading, switchGroup } = useGroup();
  const [friendsCount, setFriendsCount] = useState(0);

  const handleHomeClick = () => {
    const ownGroup = groups.find(g => g.isOwn);
    if (ownGroup) {
      switchGroup(ownGroup.id);
    }
    router.push('/browse');
  };

  const handleFriendsClick = () => {
    router.push('/friends');
  };

  // Load friends notification count
  useEffect(() => {
    if (!user) return;
    
    const loadCount = async () => {
      try {
        const response = await fetch('/api/friends/list');
        const data = await response.json();
        if (data.success) {
          setFriendsCount(data.pendingIncoming?.length || 0);
        }
      } catch (error) {
        console.error('Error loading friends count:', error);
      }
    };
    
    loadCount();
  }, [user]);

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
          <Link
            href="/browse"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <img 
              src="/logo.svg" 
              alt="RecipeBook Logo" 
              style={{ width: '32px', height: 'auto' }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              RecipeBook
            </Typography>
          </Link>

          {/* Friends Search */}
          {user && !groupsLoading && (
            <Box sx={{ ml: 3, display: 'flex', alignItems: 'center' }}>
              <FriendsSearch />
            </Box>
          )}

          {/* Navigation Items */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {/* Home */}
            <ButtonBase
              onClick={handleHomeClick}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <HomeIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  lineHeight: 1,
                }}
              >
                Home
              </Typography>
            </ButtonBase>

            {/* Friends */}
            {user && (
              <ButtonBase
                onClick={handleFriendsClick}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Badge
                  badgeContent={friendsCount}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '10px',
                      height: '18px',
                      minWidth: '18px',
                    },
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                </Badge>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '12px',
                    color: 'text.secondary',
                    lineHeight: 1,
                  }}
                >
                  Friends
                </Typography>
              </ButtonBase>
            )}

            {/* User Menu */}
            {user && <UserAvatarMenu />}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
