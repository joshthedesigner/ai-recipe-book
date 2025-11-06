'use client';

/**
 * Notification Bell Component
 * 
 * Shows badge count of pending friend requests
 * Dropdown menu with quick accept/reject actions
 * Real-time updates via Supabase subscriptions
 * 
 * ROLLBACK NOTE: Delete this file to remove Friends notification feature
 */

import { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Typography,
  Box,
  Button,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/db/supabaseClient';

interface PendingRequest {
  id: string;
  senderName: string;
  senderEmail: string;
  invitedAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Real-time subscription for new friend requests
  useEffect(() => {
    if (!user?.email) return;

    // Subscribe to changes in friends table where I might be invited
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
        (payload) => {
          console.log('Friend request update:', payload);
          loadPendingRequests(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  // Handle bell click
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

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
        loadPendingRequests(); // Refresh
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
        loadPendingRequests(); // Refresh
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
      <IconButton
        onClick={handleClick}
        sx={{ color: 'text.primary' }}
        aria-label="notifications"
      >
        <Badge badgeContent={count} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

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
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
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
            window.location.href = '/friends';
          }}
          sx={{ justifyContent: 'center', py: 1.5 }}
        >
          <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
            View All Friends
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}

