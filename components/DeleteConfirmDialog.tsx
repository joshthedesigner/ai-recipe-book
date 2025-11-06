'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import AppButton from './AppButton';
import WarningIcon from '@mui/icons-material/Warning';

interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  dialogTitle?: string;
  message?: string;
  confirmText?: string;
}

export default function DeleteConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
  loading = false,
  dialogTitle = 'Delete Recipe?',
  message,
  confirmText = 'Delete',
}: DeleteConfirmDialogProps) {
  const defaultMessage = `Are you sure you want to delete "${title}"?`;
  
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          <Typography variant="h6" component="span">
            {dialogTitle}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {message || defaultMessage}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This action cannot be undone.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </AppButton>
        <AppButton
          variant="primary"
          onClick={onConfirm}
          autoFocus
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
        >
          {loading ? 'Deleting...' : confirmText}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

