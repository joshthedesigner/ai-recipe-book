'use client';

/**
 * Recipe Chat Layout Component
 * 
 * Manages side-by-side layout for recipe content + chat on desktop/tablet
 * - Desktop: Two columns (recipe content left, chat right)
 * - Mobile: Single column (overlay chat as before)
 * - Owns chat open/close state
 * - Provides controls to children via context
 */

import { useState, createContext, useContext, ReactNode } from 'react';
import { Box, useTheme, useMediaQuery, Fab, Badge } from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import RecipeChat from './RecipeChat';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isChatOpen, setIsChatOpen] = useState(defaultIsChatOpen);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  const controls: RecipeChatControls = {
    openChat,
    closeChat,
    isChatOpen,
  };

  // Mobile: single column + overlay chat (same as before)
  if (isMobile) {
    return (
      <RecipeChatContext.Provider value={controls}>
        {children}
        <RecipeChat
          recipeId={recipeId}
          recipe={recipe}
          isOpen={isChatOpen}
          onOpenChange={setIsChatOpen}
          mode="overlay"
        />
      </RecipeChatContext.Provider>
    );
  }

  // Desktop: side-by-side layout
  return (
    <RecipeChatContext.Provider value={controls}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        {/* Left: Recipe content column */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            pl: { xs: 0, sm: 3, md: 4 },
            pr: isChatOpen ? 3 : 0,
            transition: 'padding-right 0.3s ease',
          }}
        >
          {children}
        </Box>

        {/* Right: Chat column space (reserves space when open) */}
        {isChatOpen && (
          <Box
            sx={{
              flex: '0 0 400px',
              maxWidth: 400,
              position: 'relative',
            }}
          >
            {/* Chat window positioned at bottom of this column */}
            <Box
              sx={{
                position: 'fixed',
                top: 88,
                bottom: 100,
                right: 24,
                width: '400px',
                maxHeight: 'calc(100vh - 188px)',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <RecipeChat
                recipeId={recipeId}
                recipe={recipe}
                isOpen={isChatOpen}
                onOpenChange={setIsChatOpen}
                mode="inline"
              />
            </Box>
          </Box>
        )}

        {/* FAB button - always visible on desktop */}
        <Fab
          color="primary"
          aria-label={isChatOpen ? "Chat open" : "Open recipe chat"}
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
      </Box>
    </RecipeChatContext.Provider>
  );
}

