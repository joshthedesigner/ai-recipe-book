'use client';

import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';

interface ListWithHeaderProps {
  header?: string;
  items: string[];
}

export default function ListWithHeader({ header, items }: ListWithHeaderProps) {
  return (
    <Box>
      {header && (
        <Box
          sx={{
            mb: 1.5, // 12px - spacing between header and list
            fontSize: '16px',
            lineHeight: '24px',
            fontWeight: 400,
            '& p': {
              m: 0, // Remove paragraph margins from markdown
              mb: 0,
            },
          }}
        >
          <ReactMarkdown>{header}</ReactMarkdown>
        </Box>
      )}
      <Box
        component="ul"
        sx={{
          pl: 1.25, // 20px - left padding for bullets
          mb: 0,
          mt: 0,
          listStyle: 'disc',
        }}
      >
        {items.map((item, index) => (
          <Box
            key={index}
            component="li"
            sx={{
              mb: 1, // 8px - spacing between list items
              '&:last-child': { mb: 0 },
              fontSize: '16px',
              lineHeight: '24px',
              '& p': {
                m: 0, // Remove paragraph margins inside list items
                mb: 0,
              },
            }}
          >
            <ReactMarkdown>{item}</ReactMarkdown>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

