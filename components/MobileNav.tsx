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
import PeopleIcon from '@mui/icons-material/People';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';

export default function MobileNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loading: groupsLoading, switchGroup } = useGroup();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  const handleSearchExpand = () => setSearchExpanded(true);
  const handleSearchCollapse = () => setSearchExpanded(false);

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
              /* COLLAPSED: Logo + Nav Items */
              <>
                {/* Logo */}
                <Link
                  href="/browse"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img 
                    src="/logo.svg" 
                    alt="RecipeBook Logo" 
                    style={{ width: '32px', height: 'auto' }}
                  />
                </Link>

                {/* Navigation Items */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 'auto' }}>
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
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <HomeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '10px',
                        color: 'text.secondary',
                        lineHeight: 1,
                      }}
                    >
                      Home
                    </Typography>
                  </ButtonBase>

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
                        Search
                      </Typography>
                    </ButtonBase>
                  )}

                  {/* Friends */}
                  {user && (
                    <ButtonBase
                      onClick={handleFriendsClick}
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
                      <Badge
                        badgeContent={friendsCount}
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '9px',
                            height: '16px',
                            minWidth: '16px',
                          },
                        }}
                      >
                        <PeopleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      </Badge>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '10px',
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
