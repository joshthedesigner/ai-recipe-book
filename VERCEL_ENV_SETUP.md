# Vercel Environment Variables Setup Guide

This guide lists all environment variables needed for your Recipe Book app to work on Vercel.

---

## 🔴 REQUIRED Environment Variables

These **must** be set for the app to work:

### 1. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Note:** These start with `NEXT_PUBLIC_` so they're exposed to the browser. Use the **anon key** (not the service role key).

---

### 2. OpenAI API Key
```
OPENAI_API_KEY=sk-proj-your-key-here
```

**How to get:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy the key (starts with `sk-` or `sk_proj-`)

**Important:** Keep this key secure! Never commit it to git.

---

## 🟡 OPTIONAL Environment Variables

These are **optional** but enable additional features:

### 3. Redis (Rate Limiting) - Optional
If you want production rate limiting (recommended):

```
UPSTASH_REDIS_REST_URL=https://your-redis-xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**How to get:**
1. Go to https://console.upstash.com
2. Create a Redis database
3. Copy "REST URL" → `UPSTASH_REDIS_REST_URL`
4. Copy "REST Token" → `UPSTASH_REDIS_REST_TOKEN`

**What happens if not set:**
- App will use in-memory rate limiting (only works per server instance)
- Still functional, but not ideal for production

---

### 4. Email (Invites) - Optional
If you want email invites to work:

```
RESEND_API_KEY=re_your-key-here
RESEND_FROM_EMAIL=RecipeBook <noreply@yourdomain.com>
```

**How to get:**
1. Go to https://resend.com
2. Create an API key
3. Set up a domain (or use default)
4. Copy API key → `RESEND_API_KEY`
5. Set from email → `RESEND_FROM_EMAIL`

**What happens if not set:**
- Invite emails won't be sent
- Users can still be invited, but they won't receive email notifications
- App will still work, just without email functionality

---

### 5. App URL - Optional
For production deployment:

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**What happens if not set:**
- Defaults to `http://localhost:3000`
- Email invite links will use localhost (won't work in production)
- Set this to your actual Vercel deployment URL

---

## 📋 Quick Checklist for Vercel

### Minimum Setup (App Works):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `OPENAI_API_KEY`

### Recommended Setup (Production Ready):
- [ ] All minimum variables
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `NEXT_PUBLIC_APP_URL` (your Vercel URL)

### Full Setup (All Features):
- [ ] All recommended variables
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`

---

## 🔧 How to Add in Vercel

1. **Go to your Vercel project dashboard**
2. **Click "Settings"** → **"Environment Variables"**
3. **Add each variable:**
   - Click "Add New"
   - Enter the **Key** (e.g., `OPENAI_API_KEY`)
   - Enter the **Value** (your actual key)
   - Select environments:
     - ✅ **Production** (for production deployments)
     - ✅ **Preview** (for branch deployments)
     - ✅ **Development** (optional, for local dev)
4. **Click "Save"**
5. **Redeploy** your app after adding variables

---

## ⚠️ Important Notes

1. **NEXT_PUBLIC_ variables are exposed to the browser**
   - Only use public-safe values (anon keys, URLs)
   - Never use service role keys or secrets with `NEXT_PUBLIC_`

2. **After adding variables, redeploy:**
   - Vercel doesn't automatically pick up new env vars
   - Go to "Deployments" → Click "..." → "Redeploy"

3. **Format validation:**
   - The app validates env var formats on startup
   - Check deployment logs for validation errors

4. **Supabase trigger:**
   - Don't forget to run the updated `auth-trigger.sql` in Supabase!
   - This creates groups automatically on signup

---

## 🧪 Testing Your Setup

After deployment, check:
1. ✅ App loads without errors
2. ✅ Can sign up (creates user + group)
3. ✅ Can sign in
4. ✅ Can view recipes (if any exist)
5. ✅ Can add recipes
6. ✅ Group switcher appears (if user has multiple groups)

---

## 📝 Example Vercel Environment Variables

```
# Required
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890

# Optional - Rate Limiting
UPSTASH_REDIS_REST_URL=https://magical-raven-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCdEf123456GhIjKl789012MnOpQr345678StUvWx901234YzAbCdEf567890

# Optional - Email
RESEND_API_KEY=re_abcdefghijklmnopqrstuvwxyz
RESEND_FROM_EMAIL=RecipeBook <noreply@yourdomain.com>

# Optional - App URL
NEXT_PUBLIC_APP_URL=https://ai-recipe-book.vercel.app
```

---

**Need help?** Check the deployment logs in Vercel for any validation errors.

