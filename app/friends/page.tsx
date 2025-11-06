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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
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

  // Feature flag check - redirect if disabled
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FRIENDS_FEATURE_ENABLED !== 'true') {
      router.push('/browse');
    }
  }, [router]);

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
          console.log('🔗 Friend invite accept link:', data.acceptLink);
          console.log('   Copy this link and open in a new browser window (login as recipient)');
        }
        showToast(data.message || 'Friend request sent!', 'success');
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

  if (authLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            Invite a Friend
          </Typography>
          <form onSubmit={handleSendInvite}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
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
                sx={{ minWidth: 120 }}
              >
                {sending ? <CircularProgress size={24} /> : 'Send Invite'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Pending Incoming Requests */}
      {pendingIncoming.length > 0 && (
        <Paper sx={{ mb: 4, p: 3, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Pending Friend Requests
          </Typography>
          <List>
            {pendingIncoming.map((request, index) => (
              <Box key={request.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={request.senderName}
                    secondary={request.senderEmail}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="accept"
                      onClick={() => handleAccept(request.id)}
                      sx={{ color: 'success.main', mr: 1 }}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="reject"
                      onClick={() => handleReject(request.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* Pending Outgoing Requests */}
      {pendingOutgoing.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sent Requests (Waiting)
            </Typography>
            <List>
              {pendingOutgoing.map((request, index) => (
                <Box key={request.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={request.invited_email}
                      secondary={`Sent ${new Date(request.invited_at).toLocaleDateString()}`}
                    />
                    <Chip label="Pending" size="small" color="default" />
                  </ListItem>
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon />
            My Friends ({friends.length})
          </Typography>
          
          {friends.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No friends yet. Send an invite to get started!
            </Alert>
          ) : (
            <List>
              {friends.map((friend, index) => (
                <Box key={friend.friend_id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={friend.friend_name}
                      secondary={`${friend.friend_email} • Friends since ${new Date(friend.friended_at).toLocaleDateString()}`}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

