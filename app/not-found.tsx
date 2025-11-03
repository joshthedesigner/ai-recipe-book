import Link from 'next/link';

/**
 * 404 Not Found page - must be a Server Component
 * Next.js requires not-found.tsx to be a server component by default
 */
export default function NotFound() {
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
        404
      </div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 600,
          margin: '0 0 1rem 0',
          color: '#212121',
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          fontSize: '1rem',
          color: '#666',
          margin: '0 0 2rem 0',
          maxWidth: '500px',
        }}
      >
        The page you're looking for doesn't exist.
      </p>
      <Link
        href="/browse"
        style={{
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#fff',
          backgroundColor: '#1976d2',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Go to Recipes
      </Link>
    </div>
  );
}
