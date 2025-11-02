# Email Invitation Setup Guide

This guide explains how to configure email sending for recipe group invitations.

## Overview

The RecipeBook app uses [Resend](https://resend.com) to send invitation emails. Resend is:
- ✅ Modern and developer-friendly
- ✅ Generous free tier (100 emails/day, 3,000/month)
- ✅ No credit card required for testing
- ✅ Simple API integration

---

## Setup Steps

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" (free, no credit card required)
3. Verify your email address

### 2. Get Your API Key

1. Log in to Resend Dashboard
2. Go to **API Keys** in the left sidebar
3. Click "Create API Key"
4. Name it: `RecipeBook Production` or `RecipeBook Dev`
5. Copy the API key (starts with `re_`)

### 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# From Email Address (important!)
RESEND_FROM_EMAIL=RecipeBook <noreply@yourdomain.com>

# App URL (for signup links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Notes:**
- For development/testing, you can use: `RecipeBook <onboarding@resend.dev>`
- For production, you MUST verify your own domain (see below)

### 4. Verify Your Domain (Production Only)

For production emails, you need to verify your domain:

1. Go to **Domains** in Resend Dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `recipebook.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually a few minutes)
6. Update `RESEND_FROM_EMAIL` to use your domain:
   ```bash
   RESEND_FROM_EMAIL=RecipeBook <invites@yourdomain.com>
   ```

### 5. Test the Setup

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Go to "Manage Users" in your app
3. Click "Invite User"
4. Enter a test email address
5. Click "Send Invite"
6. Check the email inbox (or Resend Dashboard → Emails)

---

## Email Template

The invitation email includes:
- ✅ Inviter's name
- ✅ Group name
- ✅ Role description (read or write)
- ✅ Clear "Accept Invitation" button
- ✅ Signup link
- ✅ Instructions for existing users
- ✅ Professional design (mobile-friendly)

---

## How It Works

### Invite Flow:
1. Group owner invites user via "Manage Users" page
2. System creates invite record in database (status: pending)
3. System sends email via Resend API
4. User clicks link and signs up (or signs in)
5. System automatically activates invite on authentication

### Email Content:
- **Subject:** `[Inviter Name] invited you to their RecipeBook collection`
- **Body:** HTML + plain text fallback
- **CTA:** "Accept Invitation" button → links to signup page

---

## Troubleshooting

### Email Not Sending

**Check Console:**
```javascript
// Look for error messages in terminal or browser console
Error sending email: [details]
```

**Common Issues:**

1. **Missing API Key**
   - Error: `RESEND_API_KEY not configured`
   - Fix: Add `RESEND_API_KEY` to `.env.local`

2. **Invalid From Email**
   - Error: `Invalid 'from' email address`
   - Fix: For testing, use `onboarding@resend.dev`
   - Fix: For production, verify your domain first

3. **Rate Limit**
   - Error: `Rate limit exceeded`
   - Fix: Free tier = 100 emails/day
   - Fix: Upgrade to paid plan if needed

4. **Domain Not Verified**
   - Error: `Domain not verified`
   - Fix: Complete domain verification in Resend Dashboard

### Testing Without Sending

If you want to test the invite flow without actually sending emails:

1. Remove `RESEND_API_KEY` from `.env.local`
2. System will create invite but skip email sending
3. You'll see: `Invite created (email sending not configured)`
4. Invite still works - user just needs to know to sign up manually

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Yes | `re_abc123...` | Your Resend API key |
| `RESEND_FROM_EMAIL` | Yes | `RecipeBook <invites@yourdomain.com>` | From email address |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://recipebook.com` | Your app's URL (for signup links) |

---

## Cost & Limits

### Resend Free Tier:
- 100 emails per day
- 3,000 emails per month
- No credit card required
- Perfect for personal/family use

### Resend Pro ($20/month):
- 50,000 emails per month
- $1 per additional 1,000
- Dedicated IPs available
- Priority support

---

## Alternative: Supabase Auth Emails

If you prefer to use Supabase's built-in email system:

1. Not currently implemented
2. Would require different approach (email templates in Supabase)
3. Less flexible than Resend
4. Free but limited customization

**Current implementation uses Resend** for better control over email design and delivery.

---

## Security Notes

- ✅ API key is server-side only (not exposed to client)
- ✅ Only group owners can send invites
- ✅ Email addresses validated before sending
- ✅ No sensitive data in email content
- ✅ Invite status tracked in database

---

## Next Steps

1. ✅ Create Resend account
2. ✅ Get API key
3. ✅ Add environment variables
4. ✅ Test invite flow
5. ✅ (Optional) Verify custom domain for production

Need help? Check:
- [Resend Documentation](https://resend.com/docs)
- [Resend Email Best Practices](https://resend.com/docs/dashboard/emails/best-practices)

