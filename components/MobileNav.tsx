'use client';

/**
 * Mobile Navigation Component
 * 
 * Optimized navigation for mobile screens (<600px)
 * Features expanding search pattern and streamlined layout
 */

import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import NotificationBell from '@/components/NotificationBell';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';

export default function MobileNav() {
  const { user } = useAuth();
  const { loading: groupsLoading } = useGroup();
  const [searchExpanded, setSearchExpanded] = useState(false);

  const handleSearchExpand = () => {
    setSearchExpanded(true);
  };

  const handleSearchCollapse = () => {
    setSearchExpanded(false);
  };

  return (
    <>
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
            minHeight: 56,
            px: '0 !important',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              px: 2,
            }}
          >
            {searchExpanded ? (
              /* EXPANDED: Back button + Full-width search */
              <>
                <IconButton 
                  onClick={handleSearchCollapse}
                  edge="start"
                  sx={{ mr: 1 }}
                >
                  <ArrowBackIcon />
                </IconButton>
                
                <Box sx={{ flex: 1 }}>
                  <FriendsSearch 
                    autoFocus
                    fullWidth
                    onSelect={handleSearchCollapse}
                  />
                </Box>
              </>
            ) : (
              /* COLLAPSED: Logo + Search Icon + Bell + Avatar */
              <>
                {/* Logo Icon Only */}
                <Link
                  href="/browse"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img 
                    src="/logo.svg" 
                    alt="RecipeBook Logo" 
                    style={{ width: '32px', height: 'auto' }}
                  />
                </Link>

                {/* Right Side Icons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                  {/* Home Icon */}
                  <IconButton component={Link} href="/browse">
                    <HomeIcon />
                  </IconButton>
                  
                  {/* Search Icon */}
                  {user && !groupsLoading && (
                    <IconButton onClick={handleSearchExpand}>
                      <SearchIcon />
                    </IconButton>
                  )}
                  
                  {/* Friends Bell */}
                  {user && <NotificationBell />}
                  
                  {/* User Avatar Menu */}
                  {user && <UserAvatarMenu />}
                </Box>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Backdrop - Dims content when search is active */}
      {searchExpanded && (
        <Box
          onClick={handleSearchCollapse}
          sx={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1200,
            transition: 'opacity 0.2s ease-in-out',
          }}
        />
      )}
    </>
  );
}

