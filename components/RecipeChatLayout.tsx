'use client';

/**
 * Recipe Assist Layout Component
 * 
 * Manages side-by-side layout for recipe content + chat on desktop/tablet
 * - Desktop: Two columns (recipe content left, chat right)
 * - Mobile: Single column (overlay chat as before)
 * - Owns chat open/close state
 * - Provides controls to children via context
 */

import { useState, createContext, useContext, ReactNode } from 'react';
import { Box, Fab, Badge } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import UnifiedChat from './UnifiedChat';
import { Recipe } from '@/types';

interface RecipeChatLayoutProps {
  children: ReactNode;
  recipeId: string;
  recipe?: Recipe;
  defaultIsChatOpen?: boolean;
}

interface RecipeChatControls {
  openChat: () => void;
  closeChat: () => void;
  isChatOpen: boolean;
}

const RecipeChatContext = createContext<RecipeChatControls | null>(null);

export function useRecipeChat() {
  const context = useContext(RecipeChatContext);
  if (!context) {
    throw new Error('useRecipeChat must be used within RecipeChatLayout');
  }
  return context;
}

export default function RecipeChatLayout({
  children,
  recipeId,
  recipe,
  defaultIsChatOpen = false,
}: RecipeChatLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(defaultIsChatOpen);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  const controls: RecipeChatControls = {
    openChat,
    closeChat,
    isChatOpen,
  };

  return (
    <RecipeChatContext.Provider value={controls}>
      <Box sx={{ position: 'relative' }}>
        {children}

        {/* FAB button - always visible */}
        <Fab
          color="primary"
          aria-label={isChatOpen ? "Assist open" : "Open recipe assist"}
          onClick={isChatOpen ? closeChat : openChat}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <Badge
            badgeContent={isChatOpen ? '' : 0}
            color="primary"
            invisible
          >
            <ChatBubbleIcon />
          </Badge>
        </Fab>

        {/* Unified Chat */}
        <UnifiedChat
          open={isChatOpen}
          onClose={closeChat}
          context="recipe"
          recipeId={recipeId}
          recipe={recipe}
        />
      </Box>
    </RecipeChatContext.Provider>
  );
}

