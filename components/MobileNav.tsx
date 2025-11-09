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
  Divider,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchExpand = () => setSearchExpanded(true);
  const handleSearchCollapse = () => setSearchExpanded(false);

  const handleHomeClick = () => {
    const ownGroup = groups.find(g => g.isOwn);
    if (ownGroup) {
      switchGroup(ownGroup.id);
    }
    router.push('/browse');
  };

  const handleFriendsClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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

  // Accept friend request
  const handleAccept = async (inviteId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'accept' }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Friend request accepted!', 'success');
        loadPendingRequests();
        // Notify GroupContext to reload (friend's group is now available)
        window.dispatchEvent(new Event('groups-refresh'));
      } else {
        showToast(data.error || 'Failed to accept request', 'error');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      showToast('Failed to accept request', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reject friend request
  const handleReject = async (inviteId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'reject' }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Friend request rejected', 'info');
        loadPendingRequests();
      } else {
        showToast(data.error || 'Failed to reject request', 'error');
      }
    } catch (error) {
      console.error('Error rejecting invite:', error);
      showToast('Failed to reject request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const open = Boolean(anchorEl);
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
              /* COLLAPSED: Logo + Nav Items */
              <>
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
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img 
                    src="/logo.svg" 
                    alt="RecipeBook Logo" 
                    style={{ width: '32px', height: 'auto' }}
                  />
                </Box>

                {/* Navigation Items */}
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
                        Search
                      </Typography>
                    </ButtonBase>
                  )}

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
                      Home
                    </Typography>
                  </ButtonBase>

                  {/* Friends */}
                  {user && (
                    <>
                      <ButtonBase
                        onClick={handleFriendsClick}
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

                      <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        PaperProps={{
                          sx: { width: 360, maxHeight: 480 },
                        }}
                      >
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            Friend Requests
                          </Typography>
                        </Box>

                        {count === 0 ? (
                          <Box sx={{ px: 2, py: 3, textAlign: 'left' }}>
                            <Typography variant="body2" color="text.secondary">
                              No pending requests
                            </Typography>
                          </Box>
                        ) : (
                          pendingRequests.map((request, index) => (
                            <Box key={request.id}>
                              {index > 0 && <Divider />}
                              <MenuItem
                                sx={{
                                  px: 2,
                                  py: 1.5,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'stretch',
                                }}
                                disableRipple
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {request.senderName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {request.senderEmail}
                                    </Typography>
                                  </Box>
                                </Box>
                                
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckIcon />}
                                    onClick={() => handleAccept(request.id)}
                                    disabled={loading}
                                    fullWidth
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<CloseIcon />}
                                    onClick={() => handleReject(request.id)}
                                    disabled={loading}
                                    fullWidth
                                  >
                                    Reject
                                  </Button>
                                </Box>
                              </MenuItem>
                            </Box>
                          ))
                        )}

                        <Divider />
                        <MenuItem
                          onClick={() => {
                            handleClose();
                            router.push('/friends');
                          }}
                          sx={{ justifyContent: 'flex-start', py: 1.5, px: 2 }}
                        >
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                            View All Friends
                          </Typography>
                        </MenuItem>
                      </Menu>
                    </>
                  )}

                  {/* Divider */}
                  {user && (
                    <Divider 
                      orientation="vertical" 
                      flexItem 
                      sx={{ 
                        mx: 0.5,
                        my: 0.75,
                        bgcolor: 'divider',
                      }} 
                    />
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
