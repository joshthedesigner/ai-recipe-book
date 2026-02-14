'use client';

/**
 * Global Chat Context
 * 
 * Manages the unified chat state across the entire app
 * - Single source of truth for chat open/close state
 * - Prevents multiple chat instances from opening
 * - Coordinates between nav button, FAB, and recipe page
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  const toggleChat = () => setIsChatOpen(prev => !prev);

  return (
    <ChatContext.Provider value={{ isChatOpen, openChat, closeChat, toggleChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

