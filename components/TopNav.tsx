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
  Select,
  Chip,
  InputAdornment,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';

export default function TopNav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { activeGroup, groups, loading: groupsLoading, switchGroup } = useGroup();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Check if user is a group owner - use activeGroup.isOwn from GroupContext
  // This is more reliable than querying separately since GroupContext already has this info
  const isGroupOwner = activeGroup?.isOwn === true || groups.some(g => g.isOwn === true);

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
      <Toolbar 
        sx={{ 
          minHeight: { xs: 56, sm: 64 }, 
          px: '0 !important',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: '1536px', // matches maxWidth="xl"
            mx: 'auto',
            px: { xs: 2, sm: 3 }, // Match MUI Container default padding (16px mobile, 24px tablet+)
          }}
        >
          {/* Logo - Clickable */}
          <Link
            href="/browse"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <RestaurantIcon sx={{ mr: 1.5, color: 'primary.main' }} />
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

          {/* Group Switcher - Only show if user has multiple groups */}
          {user && groups.length > 1 && !groupsLoading && (
            <Box sx={{ ml: 3, display: 'flex', alignItems: 'center' }}>
              <Select
                value={activeGroup?.id || ''}
                onChange={(e) => switchGroup(e.target.value)}
                size="small"
                sx={{
                  minWidth: 220,
                  '& .MuiSelect-select': {
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
                startAdornment={
                  <InputAdornment position="start">
                    <MenuBookIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                  </InputAdornment>
                }
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ flexGrow: 1, mr: 1 }}>
                        {group.name}
                      </Typography>
                      <Chip
                        label={group.isOwn ? 'Owner' : group.role}
                        size="small"
                        color={group.isOwn ? 'primary' : 'default'}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
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
                      primaryTypographyProps={{ 
                        variant: 'body1', 
                        fontWeight: 600,
                        sx: { fontSize: '16px', color: '#000000' }
                      }}
                      secondaryTypographyProps={{ 
                        variant: 'caption',
                        sx: { color: '#000000' }
                      }}
                    />
                  </MenuItem>
                  <Divider />
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
        </Box>
      </Toolbar>
    </AppBar>
  );
}

