'use client';

/**
 * Navigation Button Component (LinkedIn-style)
 * 
 * Reusable button for navigation with icon above and label below
 * Supports badges, active states, and responsive sizing
 */

import { ReactNode } from 'react';
import { ButtonBase, Box, Typography } from '@mui/material';

interface NavButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  badge?: number | boolean; // For notification counts or simple dot
  active?: boolean; // For highlighting active state
  size?: 'small' | 'medium'; // For mobile vs desktop
}

export default function NavButton({ 
  icon, 
  label, 
  onClick, 
  badge,
  active = false,
  size = 'medium'
}: NavButtonProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        p: size === 'small' ? 0.75 : 1,
        borderRadius: 1,
        '&:hover': {
          bgcolor: 'action.hover',
        },
        transition: 'background-color 0.2s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {/* Icon with optional badge */}
        <Box sx={{ position: 'relative' }}>
          {icon}
          {badge && (
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: typeof badge === 'number' ? 'auto' : 8,
                height: typeof badge === 'number' ? 18 : 8,
                minWidth: 18,
                borderRadius: '50%',
                bgcolor: 'error.main',
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: typeof badge === 'number' ? 0.5 : 0,
              }}
            >
              {typeof badge === 'number' ? badge : null}
            </Box>
          )}
        </Box>
        
        {/* Label */}
        <Typography
          variant="caption"
          sx={{
            fontSize: size === 'small' ? '10px' : '12px',
            lineHeight: 1,
            color: active ? 'text.primary' : 'text.secondary',
            fontWeight: active ? 600 : 400,
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

