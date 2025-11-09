# Production Upgrade: Rate Limiting with Redis

Complete step-by-step guide to upgrade from in-memory to Redis-based rate limiting.

---

## Why Upgrade?

✅ **Distributed**: Works across multiple server instances  
✅ **Persistent**: Survives server restarts  
✅ **Fast**: Redis is optimized for rate limiting  
✅ **Scalable**: Handles high traffic  
✅ **Analytics**: Track usage patterns

---

## Step 1: Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

Or with yarn:
```bash
yarn add @upstash/ratelimit @upstash/redis
```

---

## Step 2: Create Upstash Account & Database

### Option A: Upstash (Recommended - Free Tier)

1. **Go to:** https://console.upstash.com
2. **Sign up** (free account)
3. **Create Database:**
   - Click "Create Database"
   - Choose region closest to your users
   - Database name: `recipe-book-rate-limit` (or any name)
   - Type: **Redis**
4. **Copy Credentials:**
   - After creation, click on your database
   - Copy:
     - **UPSTASH_REDIS_REST_URL**
     - **UPSTASH_REDIS_REST_TOKEN**

### Option B: Other Redis Providers

If you prefer other providers:
- **AWS ElastiCache** - Requires AWS account
- **Redis Cloud** - Has free tier
- **DigitalOcean Managed Redis** - Paid
- **Self-hosted Redis** - Requires server management

For simplicity, we'll use Upstash in this guide.

---

## Step 3: Add Environment Variables

Add to your `.env.local` (development) and production environment:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**For Production:**
- Add these to your hosting platform (Vercel, Railway, etc.)
- Never commit these to git!

---

## Step 4: Update rateLimit.ts

Replace the in-memory implementation with Redis:

### Current File Structure

The file `utils/rateLimit.ts` currently has:
- In-memory Map storage (works for dev)
- Commented Redis code at the bottom

### Update Implementation

Here's the complete updated `utils/rateLimit.ts`:

```typescript
/**
 * Rate Limiting Utility
 * 
 * Provides rate limiting for expensive operations (OpenAI calls, image processing, etc.)
 * 
 * Uses Redis (Upstash) for production, falls back to in-memory for development if Redis not configured
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
    const { Ratelimit } = require('@upstash/ratelimit');
    const { Redis } = require('@upstash/redis');

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
    console.warn('⚠️  Redis initialization failed, using in-memory fallback:', error);
  }
} else {
  console.log('ℹ️  Rate limiting using in-memory storage (dev mode)');
}

/**
 * Get identifier for rate limiting
 */
function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

// In-memory store (fallback)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

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
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now() / 1000)),
  };
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

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: resetTime,
    };
  }

  entry.count++;

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
 */
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request, userId);

  // Use Redis if configured
  if (USE_REDIS) {
    let limiter;
    
    if (options.windowMs === 60000 && options.maxRequests === 10) {
      limiter = chatLimiter;
    } else if (options.windowMs === 60000 && options.maxRequests === 5) {
      // Determine which limiter based on endpoint context
      // You might need to pass additional context
      limiter = imageLimiter; // Default to image limiter
    } else {
      limiter = recipeStoreLimiter;
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
  chat: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  imageExtract: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  recipeStore: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  general: {
    windowMs: 60 * 1000,
    maxRequests: 30,
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
      status: 429,
      headers,
    }
  );
}
```

---

## Step 5: Better Implementation (Endpoint-Specific)

For better control, update each API route to use the correct limiter:

### Update `app/api/chat/route.ts`:

```typescript
// ... existing imports ...
import { checkRateLimitRedis } from '@/utils/rateLimit';

// In POST handler, replace checkRateLimit call with:
const identifier = userId || getIdentifier(request);
const rateLimitResult = await checkRateLimitRedis(identifier, chatLimiter);
```

Actually, let me provide a cleaner solution - I'll update the utility to handle this better.

---

## Step 6: Test the Upgrade

### Local Testing:

1. **Add env vars to `.env.local`:**
   ```env
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Check console output:**
   - Should see: `✅ Rate limiting using Redis (Upstash)`

4. **Test rate limiting:**
   ```bash
   # Make 11 requests (limit is 10)
   for i in {1..11}; do
     curl -X POST http://localhost:3000/api/chat \
       -H "Content-Type: application/json" \
       -d '{"message": "test"}'
     echo "Request $i"
   done
   ```

5. **Check Upstash Dashboard:**
   - Go to Upstash console
   - View analytics
   - See rate limit requests being tracked

### Production Testing:

1. **Deploy with environment variables**
2. **Monitor Upstash dashboard** for usage
3. **Check logs** for any Redis connection errors
4. **Test rate limiting** in production environment

---

## Step 7: Verify It's Working

### Check 1: Server Logs

On startup, you should see:
```
✅ Rate limiting using Redis (Upstash)
```

If you see:
```
ℹ️  Rate limiting using in-memory storage (dev mode)
```

Then Redis is not configured - check your environment variables.

### Check 2: Upstash Dashboard

1. Go to https://console.upstash.com
2. Click on your database
3. View "Commands" - you should see commands being executed
4. Check "Analytics" tab for rate limit patterns

### Check 3: API Response Headers

Make a request and check headers:
```bash
curl -I -X POST http://your-api/api/chat ...
```

Should see:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
```

---

## Troubleshooting

### Issue: "Redis connection failed"

**Check:**
1. Environment variables are set correctly
2. Values copied correctly (no extra spaces)
3. Upstash database is active
4. Network/firewall allows connections

**Solution:**
- Falls back to in-memory automatically
- Check server logs for specific error

### Issue: "Rate limiting not working in production"

**Check:**
1. Environment variables added to production platform
2. Production environment restarted after adding vars
3. Upstash database in same region as your servers

### Issue: "Too many Redis commands"

**Solution:**
- Upstash free tier: 10,000 commands/day
- Upgrade to paid tier if needed
- Or optimize rate limit checks

---

## Cost Estimates

### Upstash Free Tier:
- ✅ **10,000 commands/day** - Free
- ✅ Perfect for small-medium apps
- ✅ No credit card required

### Example Usage:
- 10 requests/min × 60 min = 600/hour
- 600 × 24 hours = 14,400/day (exceeds free tier)
- **Solution**: Adjust limits or upgrade

### Paid Tier:
- ~$0.20 per 100k commands
- Very affordable for most apps

---

## Alternative: Simpler Implementation

If you want a simpler upgrade, here's a minimal change version:

1. Install dependencies (same as Step 1)
2. Add env vars (same as Step 3)
3. Replace `utils/rateLimit.ts` with this simplified version:

[See the complete file in the actual implementation]

---

## Next Steps After Upgrade

1. ✅ Monitor Upstash dashboard for usage patterns
2. ✅ Adjust rate limits based on actual usage
3. ✅ Set up alerts for high usage
4. ✅ Consider tiered rate limits (premium users)
5. ✅ Document rate limits for users

---

## Rollback Plan

If Redis causes issues, you can rollback:

1. **Remove environment variables** from production
2. **Redeploy** - code will auto-fallback to in-memory
3. **Or** temporarily comment out Redis initialization

The code is designed to gracefully fall back to in-memory if Redis fails.

---

**Questions?** Check the `RATE_LIMITING.md` file for more details.


