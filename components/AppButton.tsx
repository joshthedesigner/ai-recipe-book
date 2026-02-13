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
          borderRadius: '0.5rem',
          textTransform: 'none',
          fontWeight: 600,
          color: 'hsl(24, 20%, 15%)',
          borderColor: 'hsl(24, 20%, 15%)',
          px: 3,
          py: 1.25,
          '&:hover': {
            borderColor: 'hsl(24, 20%, 15%)',
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
        borderRadius: '0.5rem',
        textTransform: 'none',
        fontWeight: 600,
        color: 'white',
        bgcolor: 'hsl(24, 85%, 55%)',
        px: 3,
        py: 1.25,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
          bgcolor: 'hsl(24, 85%, 50%)',
        },
        ...sx,
      }}
    />
  );
}
