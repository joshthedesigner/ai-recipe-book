'use client';

/**
 * Desktop Navigation Component
 * 
 * Full-featured navigation for desktop screens (>=600px)
 * Includes logo with text, inline search bar, notifications, and user menu
 */

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import NotificationBell from '@/components/NotificationBell';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';

export default function DesktopNav() {
  const { user } = useAuth();
  const { loading: groupsLoading } = useGroup();

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
      <Toolbar 
        sx={{ 
          minHeight: 64,
          px: '0 !important',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: '1536px',
            mx: 'auto',
            px: 3,
          }}
        >
          {/* Logo - Clickable */}
          <Link
            href="/browse"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <img 
              src="/logo.svg" 
              alt="RecipeBook Logo" 
              style={{ width: '32px', height: 'auto' }}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              RecipeBook
            </Typography>
          </Link>

          {/* Friends Search - Inline */}
          {user && !groupsLoading && (
            <Box sx={{ ml: 3, display: 'flex', alignItems: 'center' }}>
              <FriendsSearch />
            </Box>
          )}

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {/* Home Icon */}
            <IconButton component={Link} href="/browse">
              <HomeIcon />
            </IconButton>
            
            {/* Friends Bell */}
            {user && <NotificationBell />}
            
            {/* User Avatar Menu */}
            {user && <UserAvatarMenu />}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

