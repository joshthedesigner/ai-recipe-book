/**
 * Image Optimization Utility
 * 
 * Checks if an image URL should be optimized by Next.js Image component
 * based on the whitelist in next.config.js remotePatterns.
 * 
 * This implements a hybrid approach: known domains are optimized,
 * unknown domains fall back to unoptimized (safe, no crashes).
 */

/**
 * List of domains that are configured in next.config.js for optimization
 * Must match the remotePatterns configuration
 */
const OPTIMIZED_IMAGE_DOMAINS = [
  'recipeassist.app',              // Your own domain
  'i.ytimg.com',                   // YouTube thumbnails
  'img.youtube.com',               // YouTube images
  'www.justonecookbook.com',       // Common recipe sites
  'www.indianhealthyrecipes.com',
  // Add more common domains as you discover them in production
];

/**
 * Check if an image URL's domain is whitelisted for Next.js optimization
 * 
 * @param imageUrl - The image URL to check (can be null/undefined)
 * @returns true if domain is whitelisted and should be optimized, false otherwise
 */
export function isOptimizedImageDomain(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  
  try {
    const hostname = new URL(imageUrl).hostname;
    
    // Check if hostname matches any whitelisted domain (exact match or subdomain)
    return OPTIMIZED_IMAGE_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Invalid URL → fallback to unoptimized (safe)
    return false;
  }
}

