'use client';

/**
 * Recipe Assist Layout Component
 * 
 * Manages inline sidebar layout for recipe content + chat on desktop/tablet
 * - Desktop: Content shifts left, chat sidebar on right (inline mode)
 * - Mobile: Overlay chat with scrim (drawer mode)
 * - Owns chat open/close state
 * - Provides controls to children via context
 */

import { createContext, useContext, ReactNode } from 'react';
import { Box, Fab, Badge, useMediaQuery, useTheme } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import UnifiedChat from './UnifiedChat';
import { useChat } from '@/contexts/ChatContext';
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
  const { isChatOpen, openChat, closeChat } = useChat();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const controls: RecipeChatControls = {
    openChat,
    closeChat,
    isChatOpen,
  };

  return (
    <RecipeChatContext.Provider value={controls}>
      <Box 
        sx={{ 
          position: 'relative',
          pr: isChatOpen && !isMobile ? 'calc(450px + 48px)' : 0,
          transition: 'padding-right 0.3s ease',
        }}
      >
        {children}

        {/* FAB button - hidden when chat is open on desktop */}
        {(!isChatOpen || isMobile) && (
          <Fab
            color="primary"
            aria-label="Open recipe assistant"
            onClick={() => openChat('recipe')}
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
            <ChatBubbleIcon />
          </Fab>
        )}

        {/* Unified Chat - Inline mode on desktop */}
        {isChatOpen && !isMobile && (
          <Box
            sx={{
              position: 'fixed',
              top: { xs: 56, sm: 64 }, // Match TopNav height
              right: 0,
              bottom: 0,
              width: 450,
              zIndex: 1200,
            }}
          >
            <UnifiedChat
              open={isChatOpen}
              onClose={closeChat}
              context="recipe"
              recipeId={recipeId}
              recipe={recipe}
              mode="inline"
            />
          </Box>
        )}

        {/* Unified Chat - Drawer mode on mobile */}
        {isMobile && (
          <UnifiedChat
            open={isChatOpen}
            onClose={closeChat}
            context="recipe"
            recipeId={recipeId}
            recipe={recipe}
            mode="drawer"
          />
        )}
      </Box>
    </RecipeChatContext.Provider>
  );
}

