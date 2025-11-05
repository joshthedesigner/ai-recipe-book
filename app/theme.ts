import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'hsl(24, 85%, 55%)', // Warm orange
      contrastText: 'hsl(32, 40%, 98%)', // Light cream
    },
    secondary: {
      main: 'hsl(32, 45%, 92%)', // Light warm grey
      contrastText: 'hsl(24, 20%, 15%)', // Dark brown
    },
    background: {
      default: 'hsl(32, 40%, 98%)', // Light cream
      paper: 'hsl(0, 0%, 100%)', // White
    },
    text: {
      primary: 'hsl(24, 20%, 15%)', // Dark brown
      secondary: 'hsl(24, 10%, 45%)', // Muted brown
    },
    error: {
      main: 'hsl(0, 84.2%, 60.2%)',
      contrastText: 'hsl(32, 40%, 98%)',
    },
    divider: 'hsl(32, 20%, 88%)',
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
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
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
  shape: {
    borderRadius: 16, // 1rem = 16px
  },
  shadows: [
    'none',
    '0 4px 24px -2px hsl(24 85% 55% / 0.08)', // soft shadow
    '0 8px 32px -4px hsl(24 85% 55% / 0.12)', // medium shadow
    ...Array(22).fill('0 8px 32px -4px hsl(24 85% 55% / 0.12)'), // fill remaining shadow levels
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px -2px hsl(24 85% 55% / 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
