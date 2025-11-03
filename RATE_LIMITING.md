# Rate Limiting Implementation

## Overview

Rate limiting has been implemented to protect against:
- **Cost exhaustion attacks** (unlimited OpenAI API calls)
- **Denial of service** (resource exhaustion)
- **Abuse of free tier resources**

## Implementation Details

### Rate Limits by Endpoint

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| `/api/chat` | 10 requests | 1 minute | OpenAI API calls are expensive |
| `/api/recipes/extract-from-image` | 5 requests | 1 minute | CPU-intensive image processing |
| `/api/recipes/store` | 5 requests | 1 minute | Includes OpenAI calls and URL scraping |
| Other endpoints | 30 requests | 1 minute | General API usage |

### How It Works

1. **Identifier**: Uses authenticated user ID (if logged in) or IP address (if not)
   - User-based limiting is more secure and fair
   - Prevents IP-based workarounds

2. **Storage**: In-memory Map (development)
   - Simple and works out of the box
   - Auto-clears expired entries every 5 minutes
   - **For production**: Upgrade to Redis (see below)

3. **Response Headers**: All responses include rate limit info:
   - `X-RateLimit-Limit`: Maximum requests allowed
   - `X-RateLimit-Remaining`: Requests remaining in window
   - `X-RateLimit-Reset`: Unix timestamp when limit resets
   - `Retry-After`: Seconds until retry (when rate limited)

4. **Rate Limited Response**: Returns `429 Too Many Requests` with:
   ```json
   {
     "success": false,
     "error": "Rate limit exceeded. Please try again later.",
     "rateLimit": {
       "limit": 10,
       "remaining": 0,
       "reset": 1234567890,
       "retryAfter": 45
     }
   }
   ```

## Testing Rate Limits

### Quick Test

```bash
# Make 11 requests in quick succession (limit is 10/min)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: your-session-cookie" \
    -d '{"message": "test"}'
  echo "Request $i"
done

# The 11th request should return 429
```

### Expected Behavior

- **Requests 1-10**: ✅ `200 OK` with rate limit headers
- **Request 11**: ❌ `429 Too Many Requests`
- **After 1 minute**: ✅ Limit resets, requests work again

## Production Upgrade: Redis

For production, upgrade to Redis-based rate limiting for:
- **Distributed rate limiting** (works across multiple servers)
- **Persistence** (survives server restarts)
- **Better performance** (faster lookups)
- **More accurate** (no memory limits)

### Option 1: Upstash (Recommended - Free Tier Available)

1. **Install dependencies:**
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

2. **Create Upstash Redis instance:**
   - Go to https://upstash.com
   - Create free Redis database
   - Get REST URL and token

3. **Update `.env.local`:**
   ```env
   UPSTASH_REDIS_REST_URL=your-url-here
   UPSTASH_REDIS_REST_TOKEN=your-token-here
   ```

4. **Uncomment and update Redis code in `utils/rateLimit.ts`:**

   See the commented section at the bottom of the file for Redis implementation.

### Option 2: Vercel KV (If using Vercel)

Similar to Upstash, but uses Vercel's KV store.

### Option 3: Custom Redis

Use any Redis instance (AWS ElastiCache, Redis Cloud, etc.) with `ioredis` or `redis` npm packages.

## Configuration

### Adjusting Rate Limits

Edit `RATE_LIMITS` in `utils/rateLimit.ts`:

```typescript
export const RATE_LIMITS = {
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,      // Adjust this number
  },
  // ... other limits
};
```

### Per-User vs Per-IP

Currently uses:
- **User ID** if authenticated (more secure, per-user limits)
- **IP address** if not authenticated (fallback)

To change behavior, modify `getIdentifier()` function in `utils/rateLimit.ts`.

## Monitoring

### Check Rate Limit Status

All API responses include headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1234567890
```

### Logging

Rate limit violations are logged server-side. Consider adding:
- Alerting for excessive rate limit hits
- Metrics collection (prometheus, datadog, etc.)
- User notification when approaching limits

## Best Practices

1. **Client-Side Handling:**
   ```typescript
   // Check headers before making request
   const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
   if (remaining < 2) {
     // Warn user they're approaching limit
     showWarning('You have ' + remaining + ' requests remaining');
   }
   ```

2. **Error Handling:**
   ```typescript
   if (response.status === 429) {
     const retryAfter = parseInt(response.headers.get('Retry-After'));
     // Wait before retrying
     await sleep(retryAfter * 1000);
   }
   ```

3. **User Communication:**
   - Show rate limit info in UI
   - Display "X requests remaining" message
   - Show countdown timer when rate limited

## Security Considerations

✅ **User-based limiting** prevents IP spoofing
✅ **Authentication required** for expensive operations
✅ **Separate limits** for different endpoint types
✅ **Headers included** for client-side handling

⚠️ **In-memory storage** clears on server restart (use Redis for production)
⚠️ **No distributed limiting** with current setup (use Redis for multiple servers)

## Troubleshooting

### "Rate limit not working"

1. Check server is using latest code
2. Verify rate limit utility is imported
3. Check authentication (rate limit runs after auth check)
4. Look for errors in server console

### "Rate limit too strict"

- Adjust `maxRequests` in `RATE_LIMITS`
- Consider different limits for different user tiers
- Implement progressive rate limiting (warn before blocking)

### "Rate limit too lenient"

- Reduce `maxRequests`
- Reduce `windowMs` (shorter windows)
- Implement stricter limits for unauthenticated users

## Future Enhancements

- [ ] Tiered rate limits (premium users get higher limits)
- [ ] Adaptive rate limiting (adjust based on system load)
- [ ] Rate limit analytics dashboard
- [ ] Whitelist for trusted IPs/users
- [ ] Per-endpoint custom limits via configuration

---

**Status:** ✅ Implemented (In-memory, ready for Redis upgrade)
**Security Grade Impact:** B → B+ (with Redis: A-)

