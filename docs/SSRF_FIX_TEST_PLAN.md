# SSRF Fix - Testing Plan

**Feature:** Server-Side Request Forgery (SSRF) protection for video description link scraping  
**Fix Location:** `utils/videoExtractor.ts` - `extractRecipeFromYouTubeVideo()`  
**Risk Level:** Low (adding validation, not changing core logic)  
**Estimated Testing Time:** 20-30 minutes

---

## What the Fix Does

The SSRF fix adds URL validation **before** attempting to scrape recipe links from YouTube video descriptions. It will:

✅ **Allow:** Public recipe websites (e.g., `https://hot-thai-kitchen.com/recipe`)  
❌ **Block:** Internal/private URLs (e.g., `http://localhost:3000`, `http://192.168.1.1`)  
🔄 **Fallback:** If description link is blocked, fall back to caption extraction

**Key Behavior:** The fix should be **transparent** to legitimate users - they won't notice any difference.

---

## Test Strategy

### 1. **Positive Tests** (Should Work)
Ensure legitimate recipe extraction still works

### 2. **Negative Tests** (Should Be Blocked)
Ensure malicious URLs are rejected gracefully

### 3. **Fallback Tests** (Should Degrade Gracefully)
Ensure caption extraction works when description links fail

### 4. **Edge Cases** (Should Handle Gracefully)
Unusual but valid scenarios

---

## Detailed Test Cases

### ✅ Test Case 1: Public Recipe Link (Happy Path)

**Goal:** Verify normal recipe extraction from YouTube description still works

**Test Video:** Any cooking video with a recipe blog link in description  
**Example:** Hot Thai Kitchen Tom Kha Gai video

**Steps:**
1. Open chat in RecipeBook
2. Paste YouTube URL: `https://www.youtube.com/watch?v=VIDEO_ID`
3. Wait for extraction

**Expected Result:**
- ✅ Recipe extracted successfully
- ✅ Video link saved in database
- ✅ Recipe displays correctly
- ✅ Console shows: `"✅ Found complete recipe in description link!"`

**Pass Criteria:**
- Recipe extracted from description link (not captions)
- All fields populated (title, ingredients, steps, tags)
- Video embed works on recipe detail page
- YouTube thumbnail shows on browse page

---

### ✅ Test Case 2: Multiple Description Links

**Goal:** Verify scraping tries multiple links if first one fails

**Test Video:** Video with multiple links in description (social media + recipe blog)

**Steps:**
1. Find video with Instagram link + recipe blog link
2. Paste YouTube URL in chat
3. Observe console logs

**Expected Result:**
- ✅ Social media links skipped (existing behavior)
- ✅ Recipe blog link attempted
- ✅ Recipe extracted if available

**Pass Criteria:**
- Console shows skipping social media links
- Recipe blog link attempted
- Recipe extracted successfully

---

### ✅ Test Case 3: No Description Links (Caption Fallback)

**Goal:** Verify caption-based extraction still works

**Test Video:** Cooking video without recipe links in description

**Steps:**
1. Find video with no external links (or only social media)
2. Paste YouTube URL in chat
3. Wait for extraction

**Expected Result:**
- ✅ No valid description links found
- ✅ Falls back to caption extraction
- ✅ Recipe extracted from captions
- ✅ Console shows: `"📝 Attempting caption-based extraction..."`

**Pass Criteria:**
- Recipe extracted from captions (not description)
- Console shows fallback message
- Recipe quality is reasonable

---

### ✅ Test Case 4: HTTPS Recipe Link

**Goal:** Verify HTTPS links are allowed (most common case)

**Test URL:** Any `https://example.com/recipe` link

**Expected Result:**
- ✅ HTTPS link allowed
- ✅ Scraping attempted
- ✅ Recipe extracted if available

**Pass Criteria:**
- No blocking of HTTPS URLs
- Scraping proceeds normally

---

### ❌ Test Case 5: Localhost URL (BLOCKED)

**Goal:** Verify localhost URLs are blocked

**Manual Test:** Create test video description with `http://localhost:3000/recipe`

**Steps:**
1. In `videoExtractor.ts`, temporarily add test logging:
```typescript
// TEST ONLY - remove after testing
const testUrls = [
  'http://localhost:3000/recipe',
  'http://127.0.0.1:8080/api',
];
for (const testUrl of testUrls) {
  console.log(`Testing URL: ${testUrl}, Safe: ${isSafeUrl(testUrl)}`);
}
```
2. Run any video extraction
3. Check console logs

**Expected Result:**
- ❌ `isSafeUrl('http://localhost:3000/recipe')` returns `false`
- ✅ Console shows: `"Skipping unsafe URL: http://localhost:3000/recipe"`
- ✅ No scraping attempt made
- ✅ Falls back to captions or next link

**Pass Criteria:**
- Localhost URLs blocked
- No error thrown
- Graceful fallback occurs

---

### ❌ Test Case 6: Private IP Ranges (BLOCKED)

**Goal:** Verify private IP addresses are blocked

**Test URLs:**
- `http://192.168.1.100/recipe`
- `http://10.0.0.1/admin`
- `http://172.16.0.1/internal`

**Steps:**
1. Same manual testing approach as Test Case 5
2. Test each private IP range

**Expected Result:**
- ❌ All private IPs return `false` from `isSafeUrl()`
- ✅ Graceful handling (no crash)
- ✅ Fallback to captions

**Pass Criteria:**
- All private IP ranges blocked:
  - `192.168.x.x`
  - `10.x.x.x`
  - `172.16.x.x` through `172.31.x.x`
- No errors thrown

---

### ❌ Test Case 7: IPv6 Localhost (BLOCKED)

**Goal:** Verify IPv6 localhost is blocked

**Test URL:** `http://[::1]/recipe`

**Expected Result:**
- ❌ IPv6 localhost blocked
- ✅ No crash

**Pass Criteria:**
- `::1` detected and blocked

---

### ❌ Test Case 8: Link-Local Addresses (BLOCKED)

**Goal:** Verify link-local addresses are blocked

**Test URL:** `http://169.254.1.1/recipe`

**Expected Result:**
- ❌ Link-local address blocked
- ✅ Graceful handling

**Pass Criteria:**
- `169.254.x.x` range blocked

---

### ✅ Test Case 9: Non-HTTP Protocols (BLOCKED)

**Goal:** Verify non-HTTP/HTTPS protocols are rejected

**Test URLs:**
- `file:///etc/passwd`
- `ftp://example.com/recipe`
- `javascript:alert(1)`

**Expected Result:**
- ❌ Non-HTTP protocols blocked
- ✅ No scraping attempted

**Pass Criteria:**
- Only `http:` and `https:` allowed
- Other protocols return `false`

---

### ✅ Test Case 10: Malformed URLs (HANDLED)

**Goal:** Verify invalid URLs don't crash the app

**Test URLs:**
- `not-a-url`
- `http://`
- `https:///recipe`
- `ht!tp://example.com`

**Expected Result:**
- ✅ Invalid URLs return `false`
- ✅ No crash (caught by try-catch)
- ✅ Continues to next link or falls back to captions

**Pass Criteria:**
- `URL()` constructor errors caught
- Function returns `false`
- No unhandled exceptions

---

### ✅ Test Case 11: URL with Unusual Port

**Goal:** Verify public URLs with ports are allowed

**Test URL:** `https://example.com:8443/recipe`

**Expected Result:**
- ✅ Public URL with port allowed
- ✅ Scraping attempted

**Pass Criteria:**
- Non-standard ports don't block valid public URLs

---

### ✅ Test Case 12: End-to-End Recipe Flow

**Goal:** Verify complete recipe creation flow works

**Steps:**
1. Start fresh (clear any test data)
2. Open chat
3. Paste YouTube video with recipe in description
4. Confirm recipe preview
5. Save recipe
6. Navigate to browse page
7. Click on recipe
8. View recipe detail

**Expected Result:**
- ✅ Recipe extracted and previewed
- ✅ AI disclaimer shown
- ✅ Recipe saved to database
- ✅ YouTube thumbnail on browse card
- ✅ Video player on detail page
- ✅ All recipe data correct

**Pass Criteria:**
- Complete flow works end-to-end
- No errors in console
- Recipe data accurate
- Video embed functional

---

## Automated Testing (Optional)

If you want to write unit tests (recommended for production):

```typescript
// utils/__tests__/videoExtractor.test.ts

import { isSafeUrl } from '../videoExtractor';

describe('isSafeUrl', () => {
  describe('should allow public URLs', () => {
    test('allows HTTPS public domain', () => {
      expect(isSafeUrl('https://example.com/recipe')).toBe(true);
    });
    
    test('allows HTTP public domain', () => {
      expect(isSafeUrl('http://example.com/recipe')).toBe(true);
    });
    
    test('allows URL with port', () => {
      expect(isSafeUrl('https://example.com:8443/recipe')).toBe(true);
    });
  });
  
  describe('should block private URLs', () => {
    test('blocks localhost', () => {
      expect(isSafeUrl('http://localhost:3000')).toBe(false);
    });
    
    test('blocks 127.0.0.1', () => {
      expect(isSafeUrl('http://127.0.0.1')).toBe(false);
    });
    
    test('blocks 192.168.x.x', () => {
      expect(isSafeUrl('http://192.168.1.1')).toBe(false);
    });
    
    test('blocks 10.x.x.x', () => {
      expect(isSafeUrl('http://10.0.0.1')).toBe(false);
    });
    
    test('blocks 172.16.x.x - 172.31.x.x', () => {
      expect(isSafeUrl('http://172.16.0.1')).toBe(false);
      expect(isSafeUrl('http://172.31.255.255')).toBe(false);
    });
    
    test('blocks IPv6 localhost', () => {
      expect(isSafeUrl('http://[::1]')).toBe(false);
    });
    
    test('blocks link-local', () => {
      expect(isSafeUrl('http://169.254.1.1')).toBe(false);
    });
  });
  
  describe('should block non-HTTP protocols', () => {
    test('blocks file protocol', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });
    
    test('blocks ftp protocol', () => {
      expect(isSafeUrl('ftp://example.com')).toBe(false);
    });
  });
  
  describe('should handle malformed URLs', () => {
    test('returns false for invalid URL', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
    });
    
    test('returns false for empty string', () => {
      expect(isSafeUrl('')).toBe(false);
    });
  });
});
```

---

## Manual Testing Checklist

**Before deploying to production, verify:**

- [ ] **Test Case 1:** Public recipe link extraction works
- [ ] **Test Case 2:** Multiple description links handled correctly
- [ ] **Test Case 3:** Caption fallback works when no description links
- [ ] **Test Case 4:** HTTPS links allowed
- [ ] **Test Case 5:** Localhost URLs blocked (manual test)
- [ ] **Test Case 6:** Private IPs blocked (manual test)
- [ ] **Test Case 7:** IPv6 localhost blocked (manual test)
- [ ] **Test Case 8:** Link-local addresses blocked (manual test)
- [ ] **Test Case 9:** Non-HTTP protocols blocked (manual test)
- [ ] **Test Case 10:** Malformed URLs don't crash
- [ ] **Test Case 11:** URLs with ports work
- [ ] **Test Case 12:** End-to-end flow works

**Console Logs to Watch For:**

✅ **Good:**
```
🔗 Found links in video description, trying to scrape recipe...
   Trying to scrape recipe from: https://example.com/recipe
✅ Found complete recipe in description link!
```

❌ **Expected for blocked URLs:**
```
🔗 Found links in video description, trying to scrape recipe...
   Skipping unsafe URL: http://localhost:3000
📝 Attempting caption-based extraction...
```

🔴 **Bad (shouldn't see):**
```
Error: ECONNREFUSED
Error: Network unreachable
```

---

## What Could Break

### Unlikely But Possible Issues:

1. **False Positives:** Legitimate public URLs blocked
   - **Symptom:** Recipe extraction fails unexpectedly
   - **Fix:** Review `isSafeUrl()` logic

2. **URL Parsing Errors:** `new URL()` throws on valid URLs
   - **Symptom:** Console errors, extraction fails
   - **Fix:** Add more comprehensive try-catch

3. **Performance Impact:** URL validation adds latency
   - **Symptom:** Slower extraction
   - **Fix:** Optimize regex or add caching (unlikely to be needed)

4. **IPv4 vs IPv6 Confusion:** IPv6 URLs not handled correctly
   - **Symptom:** Public IPv6 addresses blocked
   - **Fix:** Refine IPv6 detection

---

## Rollback Plan

If the fix causes issues:

```bash
# Revert the SSRF fix commit
git revert HEAD

# Or if not committed yet
git checkout utils/videoExtractor.ts
```

**Rollback Criteria:** If more than 10% of legitimate extractions fail after deploying the fix.

---

## Success Metrics

After deploying to production, monitor:

1. **Extraction Success Rate:** Should remain ~95%+
2. **Caption Fallback Rate:** May increase slightly (blocked URLs fall back)
3. **Error Rate:** Should remain low (<1%)
4. **User Complaints:** Should be zero

**If any metric degrades significantly, investigate immediately.**

---

## Quick Test Script

For rapid manual testing, use this in the browser console:

```javascript
// Test on /browse page after importing a video recipe
const testUrls = [
  { url: 'https://example.com/recipe', expected: true },
  { url: 'http://localhost:3000', expected: false },
  { url: 'http://192.168.1.1', expected: false },
  { url: 'http://10.0.0.1', expected: false },
  { url: 'file:///etc/passwd', expected: false },
];

// Copy isSafeUrl function from videoExtractor.ts here
function isSafeUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30') ||
      hostname.startsWith('172.31.') ||
      hostname.includes('::1') ||
      hostname.includes('169.254.')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Run tests
testUrls.forEach(({ url, expected }) => {
  const result = isSafeUrl(url);
  const status = result === expected ? '✅' : '❌';
  console.log(`${status} ${url} → ${result} (expected ${expected})`);
});
```

---

## Final Recommendations

### Minimal Testing (5 minutes):
- ✅ Test Case 1 (happy path)
- ✅ Test Case 3 (caption fallback)
- ✅ Test Case 12 (end-to-end)

### Standard Testing (15 minutes):
- All minimal tests
- ✅ Test Case 5 (localhost blocked)
- ✅ Test Case 6 (private IPs blocked)

### Comprehensive Testing (30 minutes):
- All test cases
- Automated unit tests (optional)
- Production monitoring setup

**Recommended:** Start with **Standard Testing** (15 min) before production deploy.

---

## Summary

**What to test:**
1. Normal recipe extraction still works (most important!)
2. Bad URLs are blocked gracefully (verify manually)
3. Fallback to captions works
4. No crashes or errors

**Most likely outcome:** Everything works perfectly because we're **adding validation, not changing logic**.

**Time investment:** 15-30 minutes of testing protects your production app. Worth it! 🛡️

