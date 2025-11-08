'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Divider,
  Tooltip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import AppButton from '@/components/AppButton';
import { supabase } from '@/db/supabaseClient';

export default function SettingsPage() {
  const { user, signOut, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Check if user is OAuth (Google)
  const isOAuthUser =
    user?.app_metadata?.provider === 'google' ||
    !user?.identities?.some((i) => i.provider === 'email');

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Password editing
  const [showPasswordConfirmDialog, setShowPasswordConfirmDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Initialize name from user metadata
  useEffect(() => {
    if (user) {
      setNameValue(user.user_metadata?.name || '');
    }
  }, [user]);

  // Redirect if not authenticated (only after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Password validation (same as signup)
  const validatePassword = (pwd: string): { valid: boolean; error?: string } => {
    if (pwd.length < 12) {
      return { valid: false, error: 'Password must be at least 12 characters long' };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }
    if (!/[^a-zA-Z0-9]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }
    return { valid: true };
  };

  // Handle name save
  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    setNameSaving(true);
    try {
      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Name updated successfully', 'success');
        setIsEditingName(false);
        // With metadata sync enabled, nav bar will update automatically
        // Without it, nav bar will update on next page navigation
      } else {
        showToast(data.error || 'Failed to update name', 'error');
        // Revert on error
        setNameValue(user?.user_metadata?.name || '');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
      setNameValue(user?.user_metadata?.name || '');
    } finally {
      setNameSaving(false);
    }
  };

  // Handle name cancel
  const handleCancelName = () => {
    setNameValue(user?.user_metadata?.name || '');
    setIsEditingName(false);
  };

  // Handle password save
  const handleSavePassword = async () => {
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.error || 'Invalid password');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Password updated successfully', 'success');
        setIsEditingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
      } else {
        showToast(data.error || 'Failed to update password', 'error');
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle password verification (before allowing edit)
  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword) {
      setCurrentPasswordError('Password is required');
      return;
    }

    setVerifyingPassword(true);
    setCurrentPasswordError('');

    try {
      // Verify current password by attempting sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });

      if (error) {
        setCurrentPasswordError('Incorrect password');
        setVerifyingPassword(false);
        return;
      }

      // Password verified - close modal and open inline editing
      setShowPasswordConfirmDialog(false);
      setCurrentPassword('');
      setCurrentPasswordError('');
      setVerifyingPassword(false);
      setIsEditingPassword(true);
    } catch (error) {
      setCurrentPasswordError('Verification failed. Please try again.');
      setVerifyingPassword(false);
    }
  };

  // Handle password cancel
  const handleCancelPassword = () => {
    setIsEditingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  // Handle password confirmation modal cancel
  const handleCancelPasswordConfirm = () => {
    setShowPasswordConfirmDialog(false);
    setCurrentPassword('');
    setCurrentPasswordError('');
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    setDeleteError('');

    // Validate based on user type
    if (isOAuthUser) {
      if (deleteConfirmText !== 'DELETE') {
        setDeleteError('Please type DELETE to confirm');
        return;
      }
    } else {
      if (!deletePassword) {
        setDeleteError('Password is required');
        return;
      }
    }

    setDeleteLoading(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirmText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Account deleted successfully', 'success');
        await signOut();
      } else {
        setDeleteError(data.error || 'Failed to delete account');
        setDeleteLoading(false);
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error');
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <>
      <TopNav />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          Settings
        </Typography>

        {/* Name Field */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Name
              </Typography>
              {!isEditingName ? (
                <Typography variant="body1" color="text.secondary">
                  {user.user_metadata?.name || 'Not set'}
                </Typography>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    size="small"
                    autoFocus
                    disabled={nameSaving}
                    sx={{ width: '66%', mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <AppButton
                      variant="primary"
                      size="small"
                      onClick={handleSaveName}
                      disabled={nameSaving || !nameValue.trim()}
                    >
                      {nameSaving ? 'Saving...' : 'Save'}
                    </AppButton>
                    <AppButton
                      variant="secondary"
                      size="small"
                      onClick={handleCancelName}
                      disabled={nameSaving}
                    >
                      Cancel
                    </AppButton>
                  </Box>
                </Box>
              )}
            </Box>
            {!isEditingName && (
              <AppButton
                variant="secondary"
                size="small"
                onClick={() => setIsEditingName(true)}
                sx={{ minWidth: 80 }}
              >
                Edit
              </AppButton>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Email Field */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Email address
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
            <Tooltip
              title={
                isOAuthUser ? 'OAuth users cannot change their email' : 'Email cannot be changed'
              }
            >
              <span>
                <AppButton
                  variant="secondary"
                  size="small"
                  disabled
                  sx={{ minWidth: 80, opacity: 0.4, cursor: 'not-allowed' }}
                >
                  Edit
                </AppButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Password Field - Hide for OAuth users */}
        {!isOAuthUser && (
          <>
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Password
                  </Typography>
                  {!isEditingPassword ? (
                    <Typography variant="body1" color="text.secondary">
                      ••••••••••••
                    </Typography>
                  ) : (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError('');
                        }}
                        size="small"
                        error={!!passwordError}
                        disabled={passwordSaving}
                        sx={{ mb: 2 }}
                        helperText="Minimum 12 characters with uppercase, lowercase, number, and special character"
                      />
                      <TextField
                        fullWidth
                        type="password"
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError('');
                        }}
                        size="small"
                        error={!!passwordError}
                        helperText={passwordError}
                        disabled={passwordSaving}
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <AppButton
                          variant="primary"
                          size="small"
                          onClick={handleSavePassword}
                          disabled={passwordSaving || !newPassword || !confirmPassword}
                        >
                          {passwordSaving ? 'Saving...' : 'Save'}
                        </AppButton>
                        <AppButton
                          variant="secondary"
                          size="small"
                          onClick={handleCancelPassword}
                          disabled={passwordSaving}
                        >
                          Cancel
                        </AppButton>
                      </Box>
                    </Box>
                  )}
                </Box>
                {!isEditingPassword && (
                  <AppButton
                    variant="secondary"
                    size="small"
                    onClick={() => setShowPasswordConfirmDialog(true)}
                    sx={{ minWidth: 80 }}
                  >
                    Edit
                  </AppButton>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />
          </>
        )}

        {/* Delete Account */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Delete Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permanently delete your account and all associated data. This action cannot be undone.
              </Typography>
            </Box>
            <AppButton
              variant="secondary"
              size="small"
              onClick={() => setShowDeleteDialog(true)}
              sx={{
                minWidth: 80,
                color: 'error.main',
                borderColor: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'rgba(211, 47, 47, 0.04)',
                },
              }}
            >
              Delete Account
            </AppButton>
          </Box>
        </Box>

        {/* Password Confirmation Dialog */}
        <Dialog
          open={showPasswordConfirmDialog}
          onClose={() => !verifyingPassword && handleCancelPasswordConfirm()}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>
            <Typography variant="h6">Confirm Your Password</Typography>
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              To update your password, please enter your current password first.
            </Typography>

            <TextField
              fullWidth
              type="password"
              label="Current password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setCurrentPasswordError('');
              }}
              error={!!currentPasswordError}
              helperText={currentPasswordError}
              disabled={verifyingPassword}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && currentPassword) {
                  handleVerifyCurrentPassword();
                }
              }}
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <AppButton
              variant="secondary"
              onClick={handleCancelPasswordConfirm}
              disabled={verifyingPassword}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              onClick={handleVerifyCurrentPassword}
              disabled={verifyingPassword || !currentPassword}
              startIcon={verifyingPassword ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {verifyingPassword ? 'Verifying...' : 'Continue'}
            </AppButton>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => !deleteLoading && setShowDeleteDialog(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle>
            <Typography variant="h6">Delete Account?</Typography>
          </DialogTitle>

          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to permanently delete your account?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will delete all your recipes, remove you from groups, and cannot be undone.
            </Typography>

            {isOAuthUser ? (
              <TextField
                fullWidth
                label="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError('');
                }}
                error={!!deleteError}
                helperText={deleteError}
                disabled={deleteLoading}
                autoFocus
              />
            ) : (
              <TextField
                fullWidth
                type="password"
                label="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError('');
                }}
                error={!!deleteError}
                helperText={deleteError}
                disabled={deleteLoading}
                autoFocus
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <AppButton
              variant="secondary"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletePassword('');
                setDeleteConfirmText('');
                setDeleteError('');
              }}
              disabled={deleteLoading}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </AppButton>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

