/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: API route size limits are handled in route handlers, not here
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all external images (recipes come from various sources)
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache for images
  },
  
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.i.posthog.com https://us-assets.i.posthog.com", // Next.js + PostHog
              "style-src 'self' 'unsafe-inline'", // Material-UI requires unsafe-inline
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.i.posthog.com https://app.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com", // Add PostHog domains
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

