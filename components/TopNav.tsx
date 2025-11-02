'use client';

import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ChatIcon from '@mui/icons-material/Chat';
import GridViewIcon from '@mui/icons-material/GridView';
import { usePathname, useRouter } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        bgcolor: '#ffffff',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        {/* Logo */}
        <RestaurantIcon sx={{ mr: 1.5, color: 'primary.main' }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            color: 'text.primary',
            fontWeight: 600,
          }}
        >
          AI Recipe Book
        </Typography>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            onClick={() => router.push('/chat')}
            sx={{
              color: pathname === '/chat' ? 'primary.main' : 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ChatIcon />
          </IconButton>
          <IconButton
            onClick={() => router.push('/browse')}
            sx={{
              color: pathname === '/browse' ? 'primary.main' : 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <GridViewIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

