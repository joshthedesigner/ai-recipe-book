'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  open,
  title,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
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
            Delete Recipe?
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete <strong>"{title}"</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This action cannot be undone.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

