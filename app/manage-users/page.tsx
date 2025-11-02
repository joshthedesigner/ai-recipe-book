'use client';

import { useState, useEffect } from 'react';
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
  Paper,
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
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/db/supabaseClient';
import { GroupMember } from '@/types';

export default function ManageUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
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

  // Fetch group and members
  useEffect(() => {
    if (user) {
      fetchGroupAndMembers();
    }
  }, [user]);

  const fetchGroupAndMembers = async () => {
    try {
      setLoading(true);

      // Get user's owned group
      const { data: group, error: groupError } = await supabase
        .from('recipe_groups')
        .select('id, name')
        .eq('owner_id', user!.id)
        .single();

      if (groupError || !group) {
        showToast('You do not own a recipe group', 'error');
        router.push('/browse');
        return;
      }

      setGroupId(group.id);
      setGroupName(group.name);

      // Get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', group.id)
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      showToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !groupId) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setInviting(true);

      // Check if email already invited
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('email', inviteEmail.toLowerCase())
        .single();

      if (existing) {
        showToast('This email has already been invited', 'error');
        return;
      }

      // Create invite
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          status: 'pending',
          invited_by: user!.id,
        });

      if (error) throw error;

      showToast(`Invitation sent to ${inviteEmail}`, 'success');
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

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/browse')}
            sx={{ mb: 2 }}
          >
            Back to Recipes
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Manage Users
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteDialogOpen(true)}
            >
              Invite User
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {groupName}
          </Typography>
        </Box>

        {/* Members Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invited</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                  <TableRow key={member.id}>
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

