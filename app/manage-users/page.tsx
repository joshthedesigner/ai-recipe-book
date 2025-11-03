'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/db/supabaseClient';
import { GroupMember } from '@/types';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeGroup, groups, loading: groupsLoading } = useGroup();
  const { showToast } = useToast();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'read' | 'write'>('write');
  const [inviting, setInviting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchGroupAndMembers = useCallback(async () => {
    // Get current activeGroup from context at call time (not closure)
    const currentGroup = activeGroup;
    if (!currentGroup) {
      console.warn('Cannot fetch members: no active group');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching members for group:', currentGroup.id);

      // Use activeGroup from context
      const groupId = currentGroup.id;
      
      // Verify user owns this group (for manage-users page, only owners can manage)
      if (!currentGroup.isOwn) {
        showToast('You can only manage groups you own', 'error');
        router.push('/browse');
        return;
      }

      setGroupName(currentGroup.name);

      // Get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      console.log('Loaded members:', membersData?.length || 0);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      showToast('Failed to load members', 'error');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup, router, showToast]);

  // Reset state when component mounts
  useEffect(() => {
    // Reset state when component mounts to ensure fresh data
    setMembers([]);
    setGroupName('');
    setLoading(true);
  }, []); // Empty deps - only run on mount

  // Fetch group and members when activeGroup changes
  useEffect(() => {
    // Only fetch if we have all required data
    if (user && activeGroup && !groupsLoading) {
      console.log('Triggering fetchGroupAndMembers - activeGroup:', activeGroup.id);
      fetchGroupAndMembers();
    } else if (user && !groupsLoading && !activeGroup) {
      // No active group - show empty state
      console.log('No active group, showing empty state');
      setLoading(false);
      setMembers([]);
      setGroupName('');
    }
  }, [user, activeGroup?.id, groupsLoading, fetchGroupAndMembers]); // Include fetchGroupAndMembers in deps

  // Real-time subscription to member changes
  useEffect(() => {
    if (!activeGroup?.id) return;

    const subscription = supabase
      .channel('group_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${activeGroup.id}`,
        },
        (payload) => {
          console.log('Member status changed:', payload);
          fetchGroupAndMembers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeGroup?.id, fetchGroupAndMembers]);

  const handleInviteUser = async () => {
    if (!inviteEmail || !activeGroup?.id) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setInviting(true);

      // Check if email already invited
      const { data: existing, error: checkError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', activeGroup.id)
        .eq('email', inviteEmail.toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing invite:', checkError);
        showToast('Failed to check existing invites', 'error');
        return;
      }

      if (existing) {
        showToast('This email has already been invited', 'error');
        return;
      }

      // Create invite in database
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: activeGroup.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          status: 'pending',
          invited_by: user!.id,
        });

      if (error) throw error;

      // Send invitation email
      try {
        const emailResponse = await fetch('/api/invites/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteeEmail: inviteEmail.toLowerCase(),
            role: inviteRole,
            groupId: activeGroup.id,
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (emailResult.success) {
          showToast(`Invitation sent to ${inviteEmail}`, 'success');
        } else {
          // Invite created but email failed - show specific error
          const errorDetails = emailResult.details || emailResult.error || 'Unknown error';
          showToast(`Invite created. Email failed: ${errorDetails}`, 'error');
          console.error('Email sending failed:', emailResult);
        }
      } catch (emailError) {
        // Invite created but email failed - still show success
        showToast(`Invite created. Email may not have been sent.`, 'warning');
        console.error('Error sending invitation email:', emailError);
      }

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('write');
      fetchGroupAndMembers();
    } catch (error) {
      console.error('Error inviting user:', error);
      showToast('Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'read' | 'write') => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      showToast('Role updated successfully', 'success');
      fetchGroupAndMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Failed to update role', 'error');
    }
  };

  const handleDeleteClick = (member: GroupMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberToDelete.id);

      if (error) throw error;

      showToast('User removed successfully', 'success');
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      fetchGroupAndMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      showToast('Failed to remove user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip label="Active" color="success" size="small" />;
      case 'pending':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'inactive':
        return <Chip label="Inactive" color="default" size="small" />;
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          {/* Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/browse')}
            sx={{ 
              mb: 2,
              textTransform: 'none',
              color: 'black',
              '&:hover': {
                bgcolor: 'transparent',
                color: 'black',
                opacity: 0.7,
              },
            }}
          >
            Back to Recipes
          </Button>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
              Manage Users
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {groupName}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              color: 'white',
              px: 3,
              py: 1.25,
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
              },
            }}
          >
            Invite User
          </Button>
          </Box>
        </Box>

        {/* Members Table */}
        <TableContainer
          sx={{
            bgcolor: 'white',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: 'grey.50',
                }}
              >
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Invited</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No members yet. Invite users to get started!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow
                    key={member.id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <TableCell>
                      {member.email}
                      {member.user_id === user!.id && (
                        <Chip label="You" size="small" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {member.user_id === user!.id ? (
                        <Typography variant="body2">Owner</Typography>
                      ) : (
                        <Select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as 'read' | 'write')}
                          size="small"
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="read">Read</MenuItem>
                          <MenuItem value="write">Write</MenuItem>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>{getStatusChip(member.status)}</TableCell>
                    <TableCell>
                      {new Date(member.invited_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      {member.user_id !== user!.id && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(member)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>Permission Level</InputLabel>
            <Select
              value={inviteRole}
              label="Permission Level"
              onChange={(e) => setInviteRole(e.target.value as 'read' | 'write')}
            >
              <MenuItem value="read">Read (View Only)</MenuItem>
              <MenuItem value="write">Write (View + Add Recipes)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
            Cancel
          </Button>
          <Button onClick={handleInviteUser} variant="contained" disabled={inviting || !inviteEmail}>
            {inviting ? <CircularProgress size={24} /> : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{memberToDelete?.email}</strong> from your recipe group?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

