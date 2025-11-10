'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary component - must be self-contained
 * Cannot use MUI components as they require ThemeProvider context
 * which may not be available if error occurs during layout render
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Track error in PostHog
    analytics.error(error, {
      page: window.location.pathname,
      digest: error.digest,
      errorBoundary: 'page',
    });
    
    // Log the error to console
    console.error('Application error:', error);
  }, [error]);

  return (
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
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#1565c0';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#1976d2';
        }}
      >
        Try again
      </button>
    </div>
  );
}
