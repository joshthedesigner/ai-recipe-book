'use client';

import { Button, ButtonProps } from '@mui/material';

interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary';
}

export default function AppButton({ variant = 'primary', sx, ...props }: AppButtonProps) {
  if (variant === 'secondary') {
    return (
      <Button
        variant="outlined"
        {...props}
        sx={{
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 600,
          color: '#1A1A1A',
          borderColor: '#1A1A1A',
          px: 3,
          py: 1.25,
          '&:hover': {
            borderColor: '#1A1A1A',
            backgroundColor: 'rgba(26, 26, 26, 0.04)',
          },
          ...sx,
        }}
      />
    );
  }

  // Primary variant (default)
  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        borderRadius: 0,
        textTransform: 'none',
        fontWeight: 600,
        color: 'white',
        px: 3,
        py: 1.25,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
        ...sx,
      }}
    />
  );
}
