'use client';

/**
 * Friends Search Component
 * 
 * Search and navigate to friends' cookbooks
 * Typeahead dropdown with friend suggestions
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  InputAdornment,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';

interface Friend {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friended_at: string;
}

interface FriendsSearchProps {
  autoFocus?: boolean;
  fullWidth?: boolean;
  onSelect?: () => void;
}

export default function FriendsSearch({ 
  autoFocus = false, 
  fullWidth = false, 
  onSelect 
}: FriendsSearchProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, switchGroup } = useGroup();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recentSearches, setRecentSearches] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (!user) return;

    const storageKey = `friendsSearch_recentSearches_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(Array.isArray(parsed) ? parsed.slice(0, 3) : []);
      } catch (error) {
        console.error('Error loading recent searches:', error);
        setRecentSearches([]);
      }
    }
  }, [user]);

  // Load friends list
  useEffect(() => {
    if (!user || !open) return;

    const loadFriends = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/friends/list');
        const data = await response.json();

        if (data.success) {
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [user, open]);

  // Filter friends based on search
  const filteredFriends = friends.filter(friend =>
    friend.friend_name.toLowerCase().includes(searchValue.toLowerCase()) ||
    friend.friend_email.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Determine what to show: filtered results or recent searches
  const hasSearchInput = searchValue.trim().length > 0;
  const displayItems = hasSearchInput ? filteredFriends : recentSearches;
  const isShowingRecents = !hasSearchInput && recentSearches.length > 0;

  // Save friend to recent searches
  const saveToRecentSearches = (friend: Friend) => {
    if (!user) return;

    const storageKey = `friendsSearch_recentSearches_${user.id}`;
    
    // Remove if already exists (to re-add at top)
    const filtered = recentSearches.filter(f => f.friend_id !== friend.friend_id);
    
    // Add to front, limit to 3
    const updated = [
      { 
        friend_id: friend.friend_id, 
        friend_name: friend.friend_name, 
        friend_email: friend.friend_email,
        friended_at: friend.friended_at 
      }, 
      ...filtered
    ].slice(0, 3);
    
    // Update state and localStorage
    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleFriendClick = (friend: Friend) => {
    // Save to recent searches
    saveToRecentSearches(friend);
    // Find the friend's group in the groups list
    // Friend groups have isFriend=true and name contains friend's name or email
    const friendGroup = groups.find(g => 
      g.isFriend && 
      (g.name.toLowerCase().includes(friend.friend_name.toLowerCase()) ||
       g.name.toLowerCase().includes(friend.friend_email.toLowerCase()))
    );
    
    if (friendGroup) {
      switchGroup(friendGroup.id);
      router.push('/browse'); // Navigate to browse page to show friend's recipes
      setOpen(false);
      setSearchValue('');
      
      // Call parent callback (for mobile collapse)
      if (onSelect) {
        onSelect();
      }
    } else {
      console.warn('Could not find group for friend:', friend);
    }
  };

  const handleFocus = () => {
    // Only open if there are recent searches to show
    if (recentSearches.length > 0) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchValue('');
  };

  // Open dropdown when user starts typing
  useEffect(() => {
    if (searchValue.trim().length > 0) {
      setOpen(true);
    } else if (recentSearches.length === 0) {
      // Close if no search input and no recent searches
      setOpen(false);
    }
  }, [searchValue, recentSearches.length]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking inside the search input or the dropdown
      if (
        (anchorRef.current && anchorRef.current.contains(target)) ||
        (popperRef.current && popperRef.current.contains(target))
      ) {
        return;
      }
      
      handleClose();
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  if (!user) return null;

  return (
    <Box ref={anchorRef} sx={{ position: 'relative' }}>
      <TextField
        size="small"
        placeholder="Search names of friends"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={handleFocus}
        autoFocus={autoFocus}
        autoComplete="off"
        inputProps={{
          autoComplete: 'off',
          'aria-autocomplete': 'none',
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{
          width: fullWidth ? '100%' : 280,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
            },
          },
        }}
      />

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ 
          zIndex: 1300,
          width: anchorRef.current?.offsetWidth,
        }}
      >
        <Paper
          ref={popperRef}
          elevation={8}
          sx={{
            mt: 0.5,
            maxHeight: 400,
            overflow: 'auto',
            width: '100%',
            py: 1,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 2.5, py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : displayItems.length === 0 ? (
            <Box sx={{ px: 2.5, py: 2, textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">
                {searchValue ? 'No friends found' : 'No friends yet'}
              </Typography>
            </Box>
          ) : (
            <>
              {isShowingRecents && (
                <Box sx={{ px: 2.5, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Recent Searches
                  </Typography>
                </Box>
              )}
              <List dense sx={{ py: 0, px: 0.5 }}>
                {displayItems.map((friend) => (
                  <ListItem key={friend.friend_id} disablePadding>
                    <ListItemButton 
                      onClick={() => handleFriendClick(friend)}
                      sx={{ 
                        px: 2.5,
                        py: 1,
                        borderRadius: 1,
                        mx: 0.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {isShowingRecents && (
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </ListItemIcon>
                      )}
                      <ListItemText
                        primary={friend.friend_name}
                        primaryTypographyProps={{ 
                          fontWeight: 500,
                          sx: { textAlign: 'left' }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Popper>
    </Box>
  );
}

