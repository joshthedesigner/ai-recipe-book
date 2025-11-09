# Rate Limiting Production Upgrade Guide

## Quick Start: Upgrade to Upstash Redis

### Step 1: Install Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 2: Create Upstash Account

1. Go to https://upstash.com
2. Sign up (free tier available)
3. Create a new Redis database
4. Copy the REST URL and REST Token

### Step 3: Add Environment Variables

Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Step 4: Update rateLimit.ts

Replace the in-memory implementation with Redis in `utils/rateLimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiters
const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

const imageLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
});

const recipeStoreLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
});

// Update checkRateLimit function
export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request, userId);
  
  // Select appropriate limiter
  let limiter;
  if (options === RATE_LIMITS.chat) limiter = chatLimiter;
  else if (options === RATE_LIMITS.imageExtract) limiter = imageLimiter;
  else if (options === RATE_LIMITS.recipeStore) limiter = recipeStoreLimiter;
  else {
    // Fallback to in-memory for other endpoints
    return checkRateLimitMemory(request, options, userId);
  }

  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now() / 1000)),
  };
}
```

### Step 5: Test

```bash
# Restart dev server
npm run dev

# Test rate limiting works with Redis
curl -X POST http://localhost:3000/api/chat ...
```

## Benefits of Redis

- ✅ **Distributed**: Works across multiple server instances
- ✅ **Persistent**: Survives server restarts
- ✅ **Fast**: Redis is optimized for this use case
- ✅ **Analytics**: Upstash provides built-in analytics
- ✅ **Scalable**: Handles high traffic better

## Cost

**Upstash Free Tier:**
- 10,000 commands/day
- More than enough for small-medium apps
- Scales to paid tiers as needed


