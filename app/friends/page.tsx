'use client';

/**
 * Friends Page
 * 
 * Shows friends list, pending requests, and invite form
 * ROLLBACK NOTE: Delete this file to remove Friends feature UI
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import TopNav from '@/components/TopNav';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Friend {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friended_at: string;
}

interface PendingRequest {
  id: string;
  senderName: string;
  senderEmail: string;
  invitedAt: string;
}

interface PendingOutgoing {
  id: string;
  invited_email: string;
  invited_at: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<PendingRequest[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<PendingOutgoing[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'friend' | 'invite'>('friend');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Friends feature is always enabled

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load friends and pending requests
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/friends/list');
      const data = await response.json();

      if (data.success) {
        setFriends(data.friends || []);
        setPendingIncoming(data.pendingIncoming || []);
        setPendingOutgoing(data.pendingOutgoing || []);
      } else {
        showToast(data.error || 'Failed to load friends', 'error');
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      showToast('Failed to load friends', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check for friend_invite query param (from email link)
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('friend_invite');

    if (inviteId) {
      // Auto-load data to show the pending request
      loadData();
      
      // Clear the param from URL
      window.history.replaceState({}, '', '/friends');
      
      showToast('You have a pending friend request! Accept it below.', 'info');
    } else {
      loadData();
    }
  }, [user]);

  // Send friend invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/friends/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: inviteEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        // Dev mode: Show accept link in console for easy testing
        if (data.acceptLink) {
          console.log('\n========================================');
          console.log('🔗 FRIEND INVITE LINK (Copy & Paste):');
          console.log(data.acceptLink);
          console.log('========================================');
          console.log('📋 Instructions:');
          console.log('1. Copy the link above');
          console.log('2. Open in new browser/incognito window');
          console.log('3. Login as recipient to accept invite');
          console.log('========================================\n');
          
          // Also show in toast for convenience
          showToast('Invite sent! Check console for accept link (dev mode)', 'success');
        } else {
          showToast(data.message || 'Friend request sent!', 'success');
        }
        setInviteEmail('');
        loadData(); // Refresh to show in outgoing
      } else {
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to send friend request';
        console.error('API Error Response:', data);
        showToast(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      showToast('Failed to send friend request', 'error');
    } finally {
      setSending(false);
    }
  };

  // Accept friend request
  const handleAccept = async (inviteId: string) => {
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'accept' }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Friend request accepted!', 'success');
        loadData(); // Refresh lists
      } else {
        showToast(data.error || 'Failed to accept request', 'error');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      showToast('Failed to accept request', 'error');
    }
  };

  // Reject friend request
  const handleReject = async (inviteId: string) => {
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'reject' }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Friend request rejected', 'info');
        loadData(); // Refresh lists
      } else {
        showToast(data.error || 'Failed to reject request', 'error');
      }
    } catch (error) {
      console.error('Error rejecting invite:', error);
      showToast('Failed to reject request', 'error');
    }
  };

  // Open delete dialog for friend
  const handleDeleteClick = (friendId: string, friendName: string) => {
    setDeleteTarget({ id: friendId, name: friendName });
    setDeleteType('friend');
    setDeleteDialogOpen(true);
  };

  // Open delete dialog for pending invite
  const handleCancelInviteClick = (inviteId: string, inviteEmail: string) => {
    setDeleteTarget({ id: inviteId, name: inviteEmail });
    setDeleteType('invite');
    setDeleteDialogOpen(true);
  };

  // Cancel delete dialog
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // Confirm delete action
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      if (deleteType === 'friend') {
        // Delete friend (remove friendship)
        const response = await fetch('/api/friends/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId: deleteTarget.id }),
        });

        const data = await response.json();

        if (data.success) {
          showToast('Friend removed', 'success');
          loadData(); // Refresh lists
        } else {
          showToast(data.error || 'Failed to remove friend', 'error');
        }
      } else {
        // Cancel pending outgoing invite
        const response = await fetch('/api/friends/cancel-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId: deleteTarget.id }),
        });

        const data = await response.json();

        if (data.success) {
          showToast('Invite cancelled', 'success');
          loadData(); // Refresh lists
        } else {
          showToast(data.error || 'Failed to cancel invite', 'error');
        }
      }

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
      showToast(deleteType === 'friend' ? 'Failed to remove friend' : 'Failed to cancel invite', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Friends
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect with friends to share recipes and cookbook adventures
        </Typography>
      </Box>

      {/* Invite Friend Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            Invite a Friend
          </Typography>
          <form onSubmit={handleSendInvite}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
              <TextField
                fullWidth
                label="Friend's Email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                disabled={sending}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={sending || !inviteEmail.trim()}
                sx={{ minWidth: 120, height: 40 }}
              >
                {sending ? <CircularProgress size={24} /> : 'Send Invite'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Friends Table - Active and Pending */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon />
            My Friends ({friends.length + pendingIncoming.length})
          </Typography>
          
          {friends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No friends yet. Send an invite to get started!
            </Alert>
          ) : (
            <>
              <TableContainer sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Active Friends */}
                    {friends.map((friend) => (
                      <TableRow key={friend.friend_id}>
                        <TableCell>{friend.friend_name}</TableCell>
                        <TableCell>{friend.friend_email}</TableCell>
                        <TableCell>
                          <Chip label="Active" size="small" color="success" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(friend.friend_id, friend.friend_name)}
                            aria-label="delete friend"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Pending Incoming Requests */}
                    {pendingIncoming.map((request) => (
                      <TableRow key={request.id} sx={{ bgcolor: '#fff3e0' }}>
                        <TableCell>{request.senderName}</TableCell>
                        <TableCell>{request.senderEmail}</TableCell>
                        <TableCell>
                          <Chip label="Pending" size="small" color="warning" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleAccept(request.id)}
                            aria-label="accept"
                            sx={{ color: 'success.main', mr: 1 }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleReject(request.id)}
                            aria-label="reject"
                            sx={{ color: 'error.main' }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Pending Outgoing Requests */}
                    {pendingOutgoing.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>—</TableCell>
                        <TableCell>{request.invited_email}</TableCell>
                        <TableCell>
                          <Chip label="Sent" size="small" color="default" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleCancelInviteClick(request.id, request.invited_email)}
                            aria-label="cancel invite"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        title={deleteTarget?.name || ''}
        dialogTitle={deleteType === 'friend' ? 'Remove Friend?' : 'Cancel Invite?'}
        message={
          deleteType === 'friend'
            ? `Are you sure you want to remove ${deleteTarget?.name} from your friends?`
            : `Are you sure you want to cancel the invite to ${deleteTarget?.name}?`
        }
        confirmText={deleteType === 'friend' ? 'Remove' : 'Cancel Invite'}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleting}
      />
    </Container>
    </Box>
  );
}

