# Quick Upgrade Guide: In-Memory → Redis

**Time required:** 5-10 minutes  
**Difficulty:** Easy

---

## ✅ Step-by-Step

### 1. Install Packages (30 seconds)

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Create Upstash Database (2 minutes)

1. Go to: **https://console.upstash.com**
2. Sign up (free)
3. Click **"Create Database"**
4. Name it: `recipe-book-rate-limit`
5. Choose closest region
6. Click **"Create"**
7. **Copy the REST URL and REST Token**

### 3. Add Environment Variables (1 minute)

Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-redis-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**For Production** (Vercel/Railway/etc.):
- Go to your platform's environment variables
- Add both variables
- Redeploy

### 4. Verify It Works (1 minute)

Restart your server:
```bash
npm run dev
```

**Check console output:**
- ✅ Should see: `✅ Rate limiting using Redis (Upstash)`
- ❌ If you see: `ℹ️  Rate limiting using in-memory storage` → Check env vars

### 5. Test (2 minutes)

Make some API requests - rate limiting should work the same, but now using Redis!

**Check Upstash Dashboard:**
- Go to your database in Upstash console
- Click "Commands" - you'll see commands being executed
- Click "Analytics" - see usage patterns

---

## That's It! 🎉

The code **automatically detects** Redis and uses it if available.  
If Redis fails, it **automatically falls back** to in-memory.

---

## Troubleshooting

**"Still using in-memory"**
- ✅ Check env vars are set: `echo $UPSTASH_REDIS_REST_URL`
- ✅ Restart dev server after adding env vars
- ✅ Check you copied the full URL/token (no extra spaces)

**"Redis connection error"**
- ✅ Check Upstash database is active
- ✅ Verify URL/token are correct
- ✅ Code will auto-fallback to in-memory (still works!)

**"Package errors"**
- ✅ Run: `npm install @upstash/ratelimit @upstash/redis`
- ✅ Check `package.json` has the packages

---

## Cost

**Free Tier:**
- 10,000 Redis commands/day
- Perfect for small-medium apps
- No credit card needed

**If you exceed:**
- Very affordable: ~$0.20 per 100k commands
- Or adjust rate limits

---

## Next Steps

1. ✅ Monitor usage in Upstash dashboard
2. ✅ Adjust rate limits if needed
3. ✅ Set up alerts for high usage
4. ✅ Consider tiered limits (premium users get more)

---

**Need more details?** See `UPGRADE_TO_REDIS.md` for complete guide.


