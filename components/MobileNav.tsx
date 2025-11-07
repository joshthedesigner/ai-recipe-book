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
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import NotificationBell from '@/components/NotificationBell';
import FriendsSearch from '@/components/FriendsSearch';
import UserAvatarMenu from '@/components/UserAvatarMenu';
import NavButton from '@/components/NavButton';

export default function MobileNav() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, loading: groupsLoading, switchGroup } = useGroup();
  const [searchExpanded, setSearchExpanded] = useState(false);

  const handleSearchExpand = () => {
    setSearchExpanded(true);
  };

  const handleSearchCollapse = () => {
    setSearchExpanded(false);
  };

  const handleHomeClick = () => {
    // Switch to user's own cookbook
    const ownGroup = groups.find(g => g.isOwn);
    if (ownGroup) {
      switchGroup(ownGroup.id);
    }
    router.push('/browse');
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
          borderRadius: 0,
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
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', // Align to top so labels don't push icons down
                  gap: 0.25, 
                  ml: 'auto' 
                }}>
                  {/* Home */}
                  <NavButton
                    icon={<HomeIcon fontSize="small" />}
                    label="Home"
                    onClick={handleHomeClick}
                    size="small"
                  />
                  
                  {/* Search */}
                  {user && !groupsLoading && (
                    <NavButton
                      icon={<SearchIcon fontSize="small" />}
                      label="Search"
                      onClick={handleSearchExpand}
                      size="small"
                    />
                  )}
                  
                  {/* Friends Bell */}
                  {user && (
                    <Box sx={{ pt: 0.75 }}> {/* Add padding to align with NavButton */}
                      <NotificationBell />
                    </Box>
                  )}
                  
                  {/* User Avatar Menu */}
                  {user && (
                    <Box sx={{ pt: 0.75 }}> {/* Add padding to align with NavButton */}
                      <UserAvatarMenu />
                    </Box>
                  )}
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

