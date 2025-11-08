# PostHog Analytics Setup Guide

✅ **Installation Complete!**

---

## 🚀 Quick Start

### Step 1: Get Your PostHog API Key (5 minutes)

1. Go to [posthog.com](https://posthog.com) and sign up (free)
2. Create a new project
3. Go to **Settings** → **Project API Key**
4. Copy your API key (starts with `phc_`)

---

### Step 2: Add to Environment Variables (1 minute)

Add to your `.env.local` file:

```env
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**That's it!** Analytics will start tracking automatically.

---

## 📊 What's Being Tracked

### Automatic Tracking (No Code Needed)

✅ **Page views** - Every page navigation  
✅ **Button clicks** - All button interactions  
✅ **Form submissions** - Sign up, login, etc.  
✅ **Sessions** - User sessions and duration  
✅ **User journeys** - Path through your app  

### Custom Events (Already Implemented)

✅ **User signups** (email vs Google)  
✅ **User logins** (email vs Google)  
✅ **User logouts**  
✅ **Recipe creation** (with source)  
✅ **Recipe viewing**  
✅ **Recipe deletion**  
✅ **Recipe searches** (with results count)  
✅ **Friend invites**  
✅ **Friend acceptances**  
✅ **AI chat** (with intent)  
✅ **AI recipe generation**  
✅ **Settings views**  
✅ **Profile updates**  
✅ **Group switching**  

---

## 📈 View Your Data

### PostHog Dashboard

1. Go to [app.posthog.com](https://app.posthog.com)
2. Log in
3. You'll see:

```
📊 Real-time Dashboard:
├─ Daily Active Users
├─ Signups (email vs Google)
├─ Sessions & Duration
├─ Page views
├─ Top Events
├─ Live Users (right now!)
└─ User Retention (Day 1, 7, 30)
```

---

## 🎬 Enable Session Recording (Optional)

**See exactly what users do** (video playback)

1. Go to PostHog dashboard
2. **Settings** → **Project Settings** → **Recordings**
3. Toggle **Enable** session recording
4. **Done!**

Now you can:
- Watch user sessions (video)
- See clicks, scrolls, navigation
- Debug UX issues
- Filter by errors or frustration

---

## 🔬 Create Custom Dashboards

### Example: Signup Funnel

1. Go to **Insights** → **New Insight**
2. Select **Funnel**
3. Add steps:
   - Landing page view
   - Signup button click
   - user_signed_up event
   - Recipe created
4. **Save**

You'll see:
```
Landing → Signup → Complete → First Recipe
  100%      45%       38%        28%
```

---

## 🎯 Key Metrics to Track

### User Acquisition
```
- Daily signups (by method: email vs Google)
- Signup conversion rate
- First recipe created (activation)
```

### Engagement
```
- Daily active users (DAU)
- Weekly active users (WAU)
- Monthly active users (MAU)
- Session duration
- Recipes created per user
- Searches per session
```

### Retention
```
- Day 1 retention (did they come back?)
- Day 7 retention
- Day 30 retention
- Churn rate
```

### Features
```
- AI usage (% users using chat)
- Friend feature adoption
- Recipe sources (manual vs AI vs URL)
```

---

## 🔧 Advanced Usage

### Track Custom Events

```typescript
import { trackEvent } from '@/lib/analytics';

// In any component or API route
trackEvent('custom_event_name', {
  property1: 'value',
  property2: 123,
});
```

### Identify Users (Already Done)

```typescript
import { identifyUser } from '@/lib/analytics';

// After login
identifyUser(userId, {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'free', // Custom properties
});
```

### Set User Properties

```typescript
import { setUserProperties } from '@/lib/analytics';

// Segment users
setUserProperties({
  recipes_count: 15,
  has_friends: true,
  last_active: new Date(),
});
```

---

## 🎨 Example Dashboards to Create

### 1. **Growth Dashboard**
- Daily signups (line chart)
- Signup method breakdown (pie chart)
- Activation rate (funnel)
- Retention cohorts (retention table)

### 2. **Engagement Dashboard**
- DAU/WAU/MAU (line chart)
- Session duration (histogram)
- Top pages (bar chart)
- Feature usage (% of users)

### 3. **Recipe Dashboard**
- Recipes created (line chart)
- Recipe sources (pie chart: manual, AI, URL, friend)
- AI usage rate
- Search queries (top searches)

### 4. **Friends Dashboard**
- Friend invites sent
- Invite acceptance rate
- Users with friends (%)
- Friend cookbook views

---

## 💰 Cost Estimate

### Free Tier: **1M events/month**

What does this mean for you?

```
Average events per user per session: ~15-20

1M events ÷ 15 events = ~66,000 sessions/month

If each user has 3 sessions/month:
= ~22,000 monthly active users (MAU)

OR

If each user has 10 sessions/month:
= ~6,600 monthly active users (MAU)
```

**Bottom line:** Free tier covers **10K-50K users easily**.

### Paid Plan: **$450/month** for 2M events

Only needed when you exceed 1M events (50K+ active users).

---

## 🔒 Privacy & GDPR

### PostHog is Privacy-First

✅ **No cookie banner needed** (uses localStorage, not cookies)  
✅ **GDPR compliant** out of the box  
✅ **Respects Do Not Track**  
✅ **No PII tracked by default**  
✅ **Can self-host** (EU servers)  

### What We Track
- ✅ User ID (not email or name, unless you log in)
- ✅ Events (actions users take)
- ✅ Page views
- ✅ Session data

### What We DON'T Track
- ❌ Passwords
- ❌ Email addresses (unless explicitly sent)
- ❌ Personal messages
- ❌ Recipe content (only IDs)

---

## 🐛 Troubleshooting

### Analytics Not Working?

**1. Check API key is set:**
```bash
# In terminal
echo $NEXT_PUBLIC_POSTHOG_KEY
# Should show: phc_...
```

**2. Check browser console:**
```
Should see: ✅ PostHog analytics initialized
```

**3. Restart dev server:**
```bash
npm run dev
```

**4. Check PostHog dashboard:**
- Go to **Settings** → **Project**
- Verify API key matches your .env.local

---

### No Data in Dashboard?

**Wait 5-10 minutes** - PostHog processes events in real-time but may have a slight delay.

**Check "Live Events":**
1. Go to PostHog dashboard
2. **Activity** → **Live Events**
3. You should see events streaming in real-time

---

### Session Recording Not Working?

**Enable in PostHog dashboard:**
1. **Settings** → **Project Settings** → **Recordings**
2. Toggle **Enable** session recording
3. Wait 5 minutes for recording to start

---

## 📚 Additional Resources

- [PostHog Docs](https://posthog.com/docs)
- [Analytics Best Practices](https://posthog.com/docs/how-posthog-works/insights)
- [Session Recordings](https://posthog.com/docs/session-replay)
- [Feature Flags](https://posthog.com/docs/feature-flags)

---

## 🎯 Next Steps

1. ✅ Add API key to `.env.local`
2. ✅ Restart dev server (`npm run dev`)
3. ✅ Test by navigating around your app
4. ✅ Check PostHog dashboard (wait 5-10 min)
5. ✅ Create your first dashboard
6. ✅ Enable session recording (optional)

---

## 🚀 Pro Tips

### 1. Set Up Alerts
- Go to **Settings** → **Subscriptions**
- Get daily/weekly email with key metrics

### 2. Use Feature Flags
```typescript
import { posthog } from '@/lib/analytics';

if (posthog.isFeatureEnabled('new-recipe-ui')) {
  // Show new UI
}
```

### 3. A/B Testing
- Go to **Experiments**
- Create test (e.g., button colors)
- Track conversion automatically

### 4. Funnels
- Track user journey: Landing → Signup → First Recipe
- Identify drop-off points
- Optimize conversion

---

**Analytics is now installed and ready!** 🎉

Once you add your API key, you'll start seeing data immediately.

