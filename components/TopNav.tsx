'use client';

import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabaseClient';

export default function TopNav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isGroupOwner, setIsGroupOwner] = useState(false);

  // Check if user is a group owner
  useEffect(() => {
    async function checkOwnership() {
      if (!user) return;

      const { data } = await supabase
        .from('recipe_groups')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      setIsGroupOwner(data && data.length > 0);
    }

    checkOwnership();
  }, [user]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
  };

  const handleManageUsers = () => {
    handleMenuClose();
    router.push('/manage-users');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    const name = user.user_metadata?.name || user.email || '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getUserName = () => {
    return user?.user_metadata?.name || user?.email || 'User';
  };

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
          RecipeBook
        </Typography>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user && (
            <>
              <IconButton 
                onClick={handleMenuOpen} 
                disableRipple
                sx={{ 
                  gap: 0.5,
                  '&:hover': {
                    bgcolor: 'transparent',
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {getUserInitials()}
                </Avatar>
                <KeyboardArrowDownIcon sx={{ fontSize: 20, color: 'text.primary' }} />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                  },
                }}
              >
                <MenuItem disabled>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={getUserName()}
                    secondary={user.email}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </MenuItem>
                <Divider />
                {isGroupOwner && (
                  <MenuItem onClick={handleManageUsers}>
                    <ListItemIcon>
                      <PeopleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Manage Users" />
                  </MenuItem>
                )}
                <MenuItem onClick={handleSignOut}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Sign Out" />
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

