# Custom Domain Setup: recipeassist.app

This guide walks you through configuring your custom domain `recipeassist.app` for Supabase authentication, replacing the long `txjsnefjwoukvbiqddtc.supabase.co` URL in Google OAuth.

## Step 1: Get DNS Records from Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Custom Domains**
4. You should see `recipeassist.app` (or a subdomain) listed

### Expected DNS Records

Supabase will show you records similar to this:

**For subdomain (e.g., `auth.recipeassist.app`):**
```
Type: CNAME
Name: auth (or whatever subdomain you chose)
Value: txjsnefjwoukvbiqddtc.supabase.co
TTL: 3600 (or Auto)
```

**For verification:**
```
Type: TXT
Name: _supabase-challenge.auth (or your subdomain)
Value: [long verification token from Supabase]
TTL: 3600 (or Auto)
```

**📝 Note**: Copy these exact values from your Supabase dashboard before proceeding.

---

## Step 2: Add DNS Records to Your Domain Provider

### Find Your DNS Provider
Where did you purchase/manage `recipeassist.app`? Common providers:
- Cloudflare
- Namecheap
- GoDaddy
- Google Domains
- Domain.com
- Porkbun

### General Instructions (Works for Most Providers)

1. **Log in to your domain provider**
2. **Find DNS settings** (usually called "DNS", "DNS Management", "Name Servers", or "Advanced DNS")
3. **Add the CNAME record:**
   - Type: `CNAME`
   - Name/Host: `auth` (or whatever subdomain Supabase shows)
   - Value/Target: `txjsnefjwoukvbiqddtc.supabase.co`
   - TTL: `3600` or `Auto`

4. **Add the TXT record (for verification):**
   - Type: `TXT`
   - Name/Host: `_supabase-challenge.auth` (or as shown in Supabase)
   - Value: `[paste the verification token from Supabase]`
   - TTL: `3600` or `Auto`

5. **Save changes**

### Provider-Specific Notes

#### Cloudflare
- Make sure the CNAME record has the **"Proxy status" turned OFF** (gray cloud, not orange)
- Cloudflare can take 2-5 minutes to propagate

#### Namecheap
- Use `@` for root domain or `auth` for subdomain
- Namecheap automatically adds the domain, so just enter `auth` not `auth.recipeassist.app`

#### GoDaddy
- May take 10-30 minutes to propagate
- Make sure to save after each record addition

---

## Step 3: Verify DNS Propagation

### Wait for DNS to Propagate
- **Minimum**: 5-15 minutes
- **Maximum**: 48 hours (usually much faster)

### Check DNS Propagation

**Option A: Use online tools**
1. Visit https://dnschecker.org/
2. Enter: `auth.recipeassist.app` (or your subdomain)
3. Select "CNAME" from dropdown
4. Click "Search"
5. You should see: `txjsnefjwoukvbiqddtc.supabase.co`

**Option B: Use terminal (Mac/Linux)**
```bash
# Check CNAME record
dig auth.recipeassist.app CNAME

# Check TXT record
dig _supabase-challenge.auth.recipeassist.app TXT
```

Look for the CNAME pointing to your Supabase URL.

---

## Step 4: Verify in Supabase

1. Go back to **Supabase Dashboard** → **Settings** → **Custom Domains**
2. Click **"Verify"** or **"Check DNS"** button next to your domain
3. Wait for Supabase to confirm:
   - ✅ DNS records found
   - ✅ SSL certificate issued
   - ✅ Domain active

**Note**: SSL certificate provisioning can take 10-15 minutes after DNS verification.

---

## Step 5: Update Google Cloud Console OAuth Settings

Now that your custom domain is active, update Google OAuth to use it:

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under **Authorized redirect URIs**, **ADD** these:
   ```
   https://auth.recipeassist.app/auth/v1/callback
   ```
   (Replace `auth.recipeassist.app` with your actual subdomain)

6. **KEEP** the existing Supabase URL for now:
   ```
   https://txjsnefjwoukvbiqddtc.supabase.co/auth/v1/callback
   ```

7. Click **Save**

**Why keep both?** In case you need to rollback, both will work during transition.

---

## Step 6: Update OAuth Consent Screen (Optional but Recommended)

1. In Google Cloud Console, go to **OAuth consent screen**
2. Update **Authorized domains** to include:
   ```
   recipeassist.app
   ```
3. Click **Save**

This makes "recipeassist.app" appear in the OAuth screen instead of the Supabase URL.

---

## Step 7: Test the Integration

1. Clear your browser cache/cookies or use incognito mode
2. Go to your login page: http://localhost:3000/login (or your production URL)
3. Click **"Continue with Google"**
4. The OAuth screen should now show **"recipeassist.app"** instead of the Supabase URL!

---

## Troubleshooting

### DNS Records Not Propagating
- **Wait longer**: DNS can take up to 48 hours (usually 15 minutes)
- **Check provider**: Some DNS providers require you to click "Activate" or "Apply Changes"
- **Clear DNS cache**: 
  ```bash
  # Mac
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
  
  # Windows
  ipconfig /flushdns
  ```

### Supabase Shows "DNS Verification Failed"
- Double-check the TXT record value exactly matches what Supabase shows
- Make sure you didn't add quotes around the TXT value
- Wait 15-30 minutes and try "Verify" again

### SSL Certificate Pending
- This is normal - can take 10-15 minutes after DNS verification
- Supabase automatically provisions SSL certificates via Let's Encrypt
- Check back in 30 minutes

### Google OAuth Still Shows Supabase URL
- Make sure you saved the Google Cloud Console changes
- Clear browser cache
- Verify your domain is listed in "Authorized domains" on OAuth consent screen
- You may need to republish your OAuth consent screen if it's in production

### Error: "redirect_uri_mismatch"
- The redirect URI in Google Cloud Console must exactly match what Supabase uses
- Should be: `https://auth.recipeassist.app/auth/v1/callback`
- Check for typos, extra slashes, or http vs https

---

## What Subdomain Should I Use?

Common options:
- `auth.recipeassist.app` - Clear and descriptive
- `api.recipeassist.app` - If you're exposing other APIs too
- `app.recipeassist.app` - If your main app is on the root domain

**Recommendation**: Use `auth.recipeassist.app` for clarity.

---

## Next Steps After Setup

1. **Monitor**: Check Supabase logs to ensure OAuth is working
2. **Cleanup**: After a week of testing, you can remove the old Supabase redirect URI from Google Cloud Console
3. **Production**: Make sure to add your production domain's redirect URI too
4. **Branding**: Update your OAuth consent screen with logo and branding

---

## Quick Checklist

- [ ] Add CNAME record in DNS provider
- [ ] Add TXT record in DNS provider
- [ ] Wait for DNS propagation (15-60 mins)
- [ ] Verify DNS with dnschecker.org
- [ ] Verify in Supabase dashboard
- [ ] Wait for SSL certificate (10-15 mins)
- [ ] Add custom domain redirect URI to Google Cloud Console
- [ ] Add domain to Google OAuth authorized domains
- [ ] Test OAuth flow in incognito mode
- [ ] Verify user sees "recipeassist.app" in OAuth screen

---

## Current Status

**Domain**: `recipeassist.app`
**Supabase Project**: `txjsnefjwoukvbiqddtc`
**Next Step**: Add DNS records to your domain provider

Once DNS is configured, the Google OAuth screen will show:
```
Sign in with Google
to continue to recipeassist.app
```

Instead of:
```
Sign in with Google
to continue to txjsnefjwoukvbiqddtc.supabase.co
```

Much better! 🎉

