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

type ChatIntent = 'add' | 'recipe';

interface ChatContextType {
  isChatOpen: boolean;
  chatIntent: ChatIntent;
  openChat: (intent?: ChatIntent) => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatIntent, setChatIntent] = useState<ChatIntent>('add');

  const openChat = (intent: ChatIntent = 'add') => {
    setChatIntent(intent);
    setIsChatOpen(true);
  };
  
  const closeChat = () => setIsChatOpen(false);
  const toggleChat = () => setIsChatOpen(prev => !prev);

  return (
    <ChatContext.Provider value={{ isChatOpen, chatIntent, openChat, closeChat, toggleChat }}>
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

