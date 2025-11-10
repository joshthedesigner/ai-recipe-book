'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

/**
 * Global error boundary - catches errors in root layout
 * This is different from error.tsx which only catches errors in children
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Track critical error in PostHog
    analytics.error(error, {
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      digest: error.digest,
      errorBoundary: 'global',
      severity: 'critical',
    });
    
    console.error('Global error:', error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#f5f5f5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              marginBottom: '1rem',
              color: '#d32f2f',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 600,
              margin: '0 0 1rem 0',
              color: '#212121',
            }}
          >
            Something went wrong!
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#666',
              margin: '0 0 2rem 0',
              maxWidth: '500px',
            }}
          >
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#1976d2',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

