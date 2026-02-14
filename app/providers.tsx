'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import theme from './theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { GroupProvider } from '@/contexts/GroupContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { PostHogProvider } from '@/components/PostHogProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Disable auto-refetch on window focus for better UX
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PostHogProvider>
          <AuthProvider>
            <GroupProvider>
              <ToastProvider>
                <ChatProvider>
                  {children}
                </ChatProvider>
              </ToastProvider>
            </GroupProvider>
          </AuthProvider>
        </PostHogProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
