/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for expensive operations (OpenAI calls, image processing, etc.)
 * 
 * Uses Redis (Upstash) for production if configured, falls back to in-memory for development.
 */

import { NextResponse } from 'next/server';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds until retry is allowed
}

// Check if Redis is configured
const USE_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Initialize Redis if configured
let chatLimiter: any = null;
let imageLimiter: any = null;
let recipeStoreLimiter: any = null;

if (USE_REDIS) {
  try {
    // Dynamic import to avoid errors if packages not installed
    // Use dynamic import() instead of require() for better compatibility
    const upstashRatelimit = require('@upstash/ratelimit');
    const upstashRedis = require('@upstash/redis');
    const { Ratelimit } = upstashRatelimit;
    const { Redis } = upstashRedis;

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    chatLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    });

    imageLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
    });

    recipeStoreLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
    });

    console.log('✅ Rate limiting using Redis (Upstash)');
  } catch (error) {
    console.warn('⚠️  Redis packages not installed or connection failed, using in-memory fallback:', error);
  }
} else {
  console.log('ℹ️  Rate limiting using in-memory storage (dev mode - set UPSTASH env vars for Redis)');
}

/**
 * Get identifier for rate limiting
 * Prioritizes user ID (if authenticated), then IP address
 */
function getIdentifier(request: Request, userId?: string): string {
  // If user is authenticated, use user ID (more secure than IP)
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

// In-memory store (fallback for development)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit using Redis (production)
 */
async function checkRateLimitRedis(
  identifier: string,
  limiter: any
): Promise<RateLimitResult> {
  try {
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.max(0, Math.ceil(result.reset - Date.now() / 1000)),
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    throw error; // Let caller handle fallback
  }
}

/**
 * Check rate limit using in-memory storage (development)
 */
async function checkRateLimitMemory(
  request: Request,
  options: RateLimitOptions,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request, userId);
  const key = `${identifier}:${options.windowMs}`;
  const now = Date.now();
  const resetTime = now + options.windowMs;

  let entry = rateLimitStore.get(key);

  // If entry doesn't exist or has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > options.maxRequests) {
    rateLimitStore.set(key, entry);
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      reset: Math.floor(entry.resetTime / 1000),
      retryAfter,
    };
  }

  // Within limit, save and return success
  rateLimitStore.set(key, entry);
  
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - entry.count,
    reset: Math.floor(entry.resetTime / 1000),
  };
}

/**
 * Check rate limit for a request
 * Automatically uses Redis if configured, falls back to in-memory
 */
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request, userId);

  // Use Redis if configured and limiters are available
  if (USE_REDIS && (chatLimiter || imageLimiter || recipeStoreLimiter)) {
    // Determine which limiter to use based on rate limit config
    let limiter: any = null;
    
    // Match based on configuration
    if (options.windowMs === 60000 && options.maxRequests === 10) {
      limiter = chatLimiter;
    } else if (options.windowMs === 60000 && options.maxRequests === 5) {
      // For 5 req/min, we need to distinguish between image and recipe store
      // This is done at the API route level by calling with specific limiter
      // For now, default to imageLimiter (can be overridden)
      limiter = imageLimiter;
    }

    if (limiter) {
      try {
        return await checkRateLimitRedis(identifier, limiter);
      } catch (error) {
        console.error('Redis rate limit error, falling back to memory:', error);
        // Fall through to in-memory
      }
    }
  }

  // Fallback to in-memory
  return checkRateLimitMemory(request, options, userId);
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Chat endpoint - expensive OpenAI calls
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  
  // Image processing - CPU intensive
  imageExtract: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },
  
  // Recipe storage - includes OpenAI calls and URL scraping
  recipeStore: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },
  
  // General API - less restrictive
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
} as const;

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  return headers;
}

/**
 * Rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = createRateLimitHeaders(result);
  
  return NextResponse.json(
    {
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.retryAfter,
      },
    },
    {
      status: 429, // Too Many Requests
      headers,
    }
  );
}

/**
 * Direct Redis limiter access (for endpoint-specific control)
 * Use this if you need more control over which limiter to use
 */
export function getRedisLimiters() {
  return {
    chat: chatLimiter,
    image: imageLimiter,
    recipeStore: recipeStoreLimiter,
  };
}
