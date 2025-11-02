'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4b9ce2', // Blue for user messages
    },
    secondary: {
      main: '#10a37f', // ChatGPT green for accents
    },
    background: {
      default: '#ffffff', // White background
      paper: '#f1f1f1', // AI message bubble color
    },
    text: {
      primary: '#000000',
      secondary: '#9ca3af',
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    body1: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
    },
    body2: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;

