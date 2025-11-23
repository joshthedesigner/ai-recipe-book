'use client';

import {
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { RecipeNote } from '@/types';

interface NoteCardProps {
  note: RecipeNote;
}

// Simple relative time formatter
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default function NoteCard({ note }: NoteCardProps) {

  return (
    <Box
      sx={{
        p: 3,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
          <PersonIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {note.user_name || 'Unknown'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(note.created_at)}
              {note.updated_at !== note.created_at && ' (edited)'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Note Text */}
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          mb: note.photo_urls && note.photo_urls.length > 0 ? 2 : 0,
        }}
      >
        {note.note_text}
      </Typography>

      {/* Photos */}
      {note.photo_urls && note.photo_urls.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {note.photo_urls.map((url, index) => (
            <Box key={index} sx={{ mb: index < note.photo_urls!.length - 1 ? 2 : 0 }}>
              <img
                src={url}
                alt={`Note photo ${index + 1}`}
                loading="lazy"
                style={{
                  width: '25%', // 25% of card container width
                  height: 'auto',
                  borderRadius: 8,
                  display: 'block',
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

