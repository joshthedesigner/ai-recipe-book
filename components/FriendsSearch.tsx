'use client';

/**
 * Friends Search Component
 * 
 * Search and navigate to friends' cookbooks
 * Typeahead dropdown with friend suggestions
 */

import { useState, useEffect, useRef } from 'react';
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

export default function FriendsSearch() {
  const { user } = useAuth();
  const { groups, switchGroup } = useGroup();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

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
      setOpen(false);
      setSearchValue('');
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
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        handleClose();
      }
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
        placeholder="Search friends' cookbooks..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={handleFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{
          width: 280,
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
        sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth }}
      >
        <Paper
          elevation={8}
          sx={{
            mt: 0.5,
            maxHeight: 400,
            overflow: 'auto',
            width: '100%',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredFriends.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {searchValue ? 'No friends found' : 'No friends yet'}
              </Typography>
            </Box>
          ) : (
            <List dense>
              {filteredFriends.map((friend) => (
                <ListItem key={friend.friend_id} disablePadding>
                  <ListItemButton onClick={() => handleFriendClick(friend)}>
                    <ListItemText
                      primary={friend.friend_name}
                      secondary={friend.friend_email}
                      primaryTypographyProps={{ fontWeight: 500 }}
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

