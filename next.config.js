/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: API route size limits are handled in route handlers, not here
  
  // Fix file watching issues on macOS
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 2000, // Check for changes every 2 seconds
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: /node_modules/, // Don't watch node_modules
      };
    }
    return config;
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
              "style-src 'self' 'unsafe-inline'", // Material-UI requires unsafe-inline
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com", // Allow YouTube embeds
              "frame-ancestors 'self'",
            ].join('; ')
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig

