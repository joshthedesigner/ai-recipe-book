'use client';

import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  message: string;
  timestamp?: string;
}

export default function MessageBubble({ role, message, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 3, // More space between messages
      }}
    >
      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '600px',
          width: isUser ? 'auto' : '100%', // User bubble hugs text, AI spans full width
          bgcolor: isUser ? '#f4f4f4' : 'transparent', // Grey bubble for user, no bubble for AI
          color: 'text.primary',
          borderRadius: isUser ? '18px' : '0',
          py: isUser ? 1 : 0, // 8px top and bottom for user bubble
          px: isUser ? 1.5 : 0, // 12px left and right for user bubble
          fontSize: '16px',
          lineHeight: '24px',
          fontWeight: 400,
          '& p': { 
            m: 0, // Remove default margins
            mb: 0.5, // Tighter spacing between paragraphs (4px)
            '&:last-child': { mb: 0 },
          },
          '& strong': { fontWeight: 600 },
          '& code': {
            bgcolor: 'rgba(0,0,0,0.05)',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          '& pre': {
            bgcolor: 'rgba(0,0,0,0.05)',
            p: 1.5,
            borderRadius: 1,
            overflow: 'auto',
            my: 1,
          },
          '& ul, & ol': {
            pl: 2.5,
            mb: 0.5, // Tighter spacing after lists (4px)
            mt: 0.5, // Add small top margin (4px)
          },
          '& li': {
            mb: 0.25, // Tighter spacing between list items (2px)
          },
          '& h1, & h2, & h3': {
            fontWeight: 600,
            mt: 1.5,
            mb: 1,
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'underline',
            '&:hover': {
              textDecoration: 'none',
            },
          },
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <ReactMarkdown>{message}</ReactMarkdown>
      </Box>
    </Box>
  );
}

