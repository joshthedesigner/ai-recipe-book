# Redis Setup Walkthrough - Step by Step

Let's set up Redis for rate limiting in 5 minutes!

---

## Step 1: Install Packages (1 minute)

Open your terminal in the project directory and run:

```bash
npm install @upstash/ratelimit @upstash/redis
```

**What this does:** Installs the Redis client libraries for Upstash.

**Expected output:**
```
added 15 packages, and audited 1234 packages
```

✅ **Check:** No errors in the output

---

## Step 2: Create Upstash Account & Database (3 minutes)

### 2.1: Go to Upstash

1. Open your browser
2. Go to: **https://console.upstash.com**
3. Click **"Sign Up"** (or "Log In" if you have an account)

### 2.2: Create Database

1. After logging in, click the **"Create Database"** button (big green button)
2. Fill in the form:
   - **Database Name:** `recipe-book-rate-limit` (or any name you like)
   - **Type:** Select **"Redis"**
   - **Region:** Choose the region closest to your users (or where your app is hosted)
     - If deploying to Vercel: Choose a region near your Vercel region
     - US East is good for most US users
     - EU West for European users
3. Click **"Create"**
4. Wait ~10 seconds for database to be created

### 2.3: Get Your Credentials

After the database is created, you'll see a page with connection details:

1. Look for **"REST API"** section
2. You'll see two values:
   - **UPSTASH_REDIS_REST_URL** - Copy this (starts with `https://`)
   - **UPSTASH_REDIS_REST_TOKEN** - Copy this (long alphanumeric string)

**⚠️ Important:** Keep these safe! Don't share them publicly.

**💡 Tip:** You can click the copy icon next to each value, or manually select and copy.

✅ **Check:** You have both URL and Token copied

---

## Step 3: Add Environment Variables (1 minute)

### 3.1: Local Development (.env.local)

1. Open `.env.local` in your project (create it if it doesn't exist)
2. Add these two lines at the bottom:

```env
UPSTASH_REDIS_REST_URL=https://your-actual-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-actual-token-here
```

**Replace:**
- `https://your-actual-url.upstash.io` with your actual REST URL
- `your-actual-token-here` with your actual REST Token

**Example:**
```env
UPSTASH_REDIS_REST_URL=https://magical-raven-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCdEf123456GhIjKl789012MnOpQr345678StUvWx901234YzAbCdEf567890
```

3. **Save the file**

✅ **Check:** File saved, values are correct (no extra spaces, quotes not needed)

### 3.2: Production Environment

**For Vercel:**
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Name:** `UPSTASH_REDIS_REST_URL`
   - **Value:** (paste your REST URL)
   - **Environment:** Production (and Preview if you want)
4. Add:
   - **Name:** `UPSTASH_REDIS_REST_TOKEN`
   - **Value:** (paste your REST Token)
   - **Environment:** Production (and Preview)
5. Click **Save**
6. **Redeploy** your app (or it will auto-redeploy)

**For Railway:**
1. Go to your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add both variables
6. App will auto-redeploy

**For Render:**
1. Go to your Render dashboard
2. Select your service
3. Go to **Environment** tab
4. Add both variables
5. Save (auto-redeploys)

**For other platforms:** Add environment variables in your platform's settings, then restart/redeploy.

---

## Step 4: Restart Your Server (30 seconds)

### Local Development:

```bash
# Stop your current server (Ctrl+C if running)
# Then restart:
npm run dev
```

### Production:

- **Vercel:** Auto-redeploys after adding env vars (or click "Redeploy")
- **Railway/Render:** Auto-redeploys when env vars change
- **Others:** Restart your service

---

## Step 5: Verify It's Working (1 minute)

### 5.1: Check Server Logs

When your server starts, look at the console output:

**✅ Success (using Redis):**
```
✅ Rate limiting using Redis (Upstash)
```

**⚠️ Fallback (still using in-memory):**
```
ℹ️  Rate limiting using in-memory storage (dev mode - set UPSTASH env vars for Redis)
```

**If you see the fallback message:**
- Check your `.env.local` file is saved
- Check environment variable names are exactly correct
- Check no extra spaces in values
- Restart server again

### 5.2: Test Rate Limiting

Make some API requests to verify it's working:

```bash
# Make 11 requests (limit is 10)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}'
  echo "Request $i"
  sleep 1
done
```

**Expected:**
- Requests 1-10: ✅ `200 OK`
- Request 11: ❌ `429 Too Many Requests`

### 5.3: Check Upstash Dashboard

1. Go back to https://console.upstash.com
2. Click on your database
3. Go to **"Commands"** tab
4. You should see commands being executed
5. Go to **"Analytics"** tab
6. You'll see usage graphs (may take a minute to populate)

✅ **Check:** You see activity in the Upstash dashboard

---

## Troubleshooting

### Issue: "Still using in-memory"

**Check:**
1. ✅ Environment variables in `.env.local`?
2. ✅ Variable names exactly correct? (case-sensitive)
3. ✅ No extra spaces in values?
4. ✅ Server restarted after adding vars?
5. ✅ `.env.local` file is in project root (not subfolder)?

**Solution:**
```bash
# Verify env vars are loaded
node -e "console.log(process.env.UPSTASH_REDIS_REST_URL)"
# Should print your URL (if using dotenv, may need to load first)
```

### Issue: "Redis connection error"

**Check:**
1. ✅ URL starts with `https://`?
2. ✅ Token is complete (long string)?
3. ✅ Database is active in Upstash dashboard?
4. ✅ Network/firewall allows outbound HTTPS?

**Solution:**
- Code will auto-fallback to in-memory (still works)
- Check server logs for specific error
- Verify credentials in Upstash dashboard

### Issue: "Package not found"

**Solution:**
```bash
# Reinstall packages
npm install @upstash/ratelimit @upstash/redis

# If that doesn't work:
rm -rf node_modules package-lock.json
npm install
```

---

## Success Checklist

- [ ] Packages installed (`npm install` completed)
- [ ] Upstash account created
- [ ] Redis database created
- [ ] REST URL copied
- [ ] REST Token copied
- [ ] Added to `.env.local` (local)
- [ ] Added to production platform (Vercel/etc.)
- [ ] Server restarted
- [ ] Console shows "✅ Rate limiting using Redis"
- [ ] Upstash dashboard shows activity

---

## Next Steps

✅ **You're done!** Redis is now active.

**Optional enhancements:**
1. Monitor usage in Upstash dashboard
2. Adjust rate limits if needed (in `utils/rateLimit.ts`)
3. Set up alerts for high usage (Upstash dashboard)
4. Consider tiered limits (premium users get more)

---

## Quick Reference

**Upstash Console:** https://console.upstash.com  
**Free Tier:** 10,000 commands/day  
**Upgrade:** If you exceed, very affordable (~$0.20/100k)

**Env Vars Needed:**
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Verify:**
- Server log: "✅ Rate limiting using Redis"
- Upstash dashboard: Commands being executed
- API: Rate limiting works

---

**Questions?** The code automatically handles everything - just add the env vars and restart!

