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
  Typography,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
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
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);

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

  const handleFriendClick = (friend: Friend) => {
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
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSearchValue('');
  };

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
        placeholder="Search for your friends"
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
          width: fullWidth ? '100vw' : anchorRef.current?.offsetWidth,
          left: fullWidth ? '0 !important' : undefined,
          right: fullWidth ? 0 : undefined,
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
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', p: 2, pl: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredFriends.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'left' }}>
              <Typography variant="body2" color="text.secondary">
                {searchValue ? 'No friends found' : 'No friends yet'}
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ py: 0 }}>
              {filteredFriends.map((friend) => (
                <ListItem key={friend.friend_id} disablePadding>
                  <ListItemButton 
                    onClick={() => handleFriendClick(friend)}
                    sx={{ 
                      px: 2,
                      py: 1.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={friend.friend_name}
                      secondary={friend.friend_email}
                      primaryTypographyProps={{ 
                        fontWeight: 500,
                        sx: { textAlign: 'left' }
                      }}
                      secondaryTypographyProps={{
                        sx: { textAlign: 'left' }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Popper>
    </Box>
  );
}

