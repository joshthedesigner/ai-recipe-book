'use client';

import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  message: string;
  timestamp?: string;
  children?: React.ReactNode; // Optional children for custom components (e.g., ListWithHeader)
}

export default function MessageBubble({ role, message, timestamp, children }: MessageBubbleProps) {
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
          // Paragraph Style: 12px spacing between paragraphs
          '& p': { 
            m: 0, // Remove default margins
            mb: 0.75, // 12px - standard paragraph spacing
            '&:last-child': { mb: 0 },
          },
          // Reduce paragraph bottom margin when it introduces a list
          '& p:has(+ ul), & p:has(+ ol)': {
            mb: -0.125, // -2px - negative margin to further reduce spacing
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
          // List Style: 12px top/bottom (equal to paragraph spacing), 4px between items
          '& ul, & ol': {
            pl: 1.25,  // 20px - left padding for bullets
            mb: 0.75,  // 12px - same as paragraph spacing
            mt: 0.75,  // 12px - same as paragraph spacing (equal spacing)
          },
          // When list immediately follows a block element (e.g., "Examples:" → list), reduce spacing
          // This creates visual connection between introducing content and its list
          // Use negative margin to pull list closer (works even if :has() isn't supported)
          '& p + ul, & p + ol, & h1 + ul, & h2 + ul, & h3 + ul, & h4 + ul, & h5 + ul, & h6 + ul': {
            mt: -0.75,  // -12px - negative margin to pull list much closer (reduced by half)
          },
          '& li': {
            mb: 0.25,  // 4px - tighter spacing between list items
            '&:last-child': { mb: 0 },
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
        {message && <ReactMarkdown>{message}</ReactMarkdown>}
        {children}
      </Box>
    </Box>
  );
}

