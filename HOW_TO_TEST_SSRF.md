# How to Test SSRF Protection in the App

The SSRF protection **is working** - here's how to verify it in your application:

## ✅ Quick Verification (Code Test)

We already ran this and it passed:
```bash
node test-ssrf.js
# Result: ✅ All 10 SSRF protection tests passed!
```

`http://localhost:8080/admin` is correctly being **blocked** (returned `false`).

## 🌐 How to Test in the Browser (User-Facing)

### Step-by-Step:

1. **Start your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open your app in browser:**
   - Go to: `http://localhost:3000`
   - **Log in** (authentication is now required)

3. **Navigate to Chat/Recipe Input:**
   - Find where you can add recipes (chat interface or recipe input)

4. **Try to save a recipe with a blocked URL:**

   Try these messages:
   - `"Save this recipe: http://localhost:8080/admin"`
   - `"Save recipe from http://127.0.0.1:8080/test"`
   - `"http://192.168.1.1/admin"`

5. **Expected Result:**

   You should see an error message like:
   ```
   Sorry, I couldn't scrape the recipe from that URL. 
   Invalid or unsafe URL. Please provide a valid public HTTP/HTTPS URL.
   
   Try copying and pasting the recipe text instead!
   ```

### What Should Happen:

✅ **BLOCKED URLs** (should show error):
- `http://localhost:8080/admin`
- `http://localhost/admin`
- `http://127.0.0.1:8080/test`
- `http://192.168.1.1/admin`
- `file:///etc/passwd`
- `ftp://example.com/file`

✅ **ALLOWED URLs** (should work):
- `https://www.allrecipes.com/recipe/12345/chocolate-cake`
- `https://example.com/recipe`
- Any public HTTPS/HTTP URL

## 🔍 Debug: If You're Not Seeing the Error

### Check 1: Are you logged in?
- SSRF protection works, but you need to be authenticated first
- Authentication check happens before URL validation
- If not logged in, you'll see: "Unauthorized. Please log in to continue."

### Check 2: Check Server Console
When you try to save a blocked URL, look at your terminal where `npm run dev` is running. You should see:
```
Blocked private/internal IP: localhost
```
or
```
Error scraping URL: Error: Invalid or unsafe URL...
```

### Check 3: Check Browser Console
- Open DevTools (F12)
- Go to Network tab
- Try saving the recipe
- Check the API response - should show error message

## 🧪 Direct API Test (If Browser Test Doesn't Work)

If you want to test the API directly with authentication:

```bash
# First, get a session token (you'll need to log in via browser first)
# Then test with authenticated request:

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie-here" \
  -d '{"message": "Save recipe from http://localhost:8080/admin"}'
```

## ✅ Verification Checklist

- [ ] Code test passed (`node test-ssrf.js`)
- [ ] Tried blocked URL in browser (logged in)
- [ ] Saw error message about "Invalid or unsafe URL"
- [ ] Server console shows "Blocked private/internal IP"
- [ ] Valid public URL works correctly

## 🐛 If It's Still Not Working

1. **Make sure code is saved:**
   - Check `utils/recipeScraper.ts` has the `validateUrl` function
   - Check `scrapeRecipe` function calls `validateUrl` before making request

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check browser cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

4. **Verify the URL is being detected:**
   - The URL must be detected by `containsURL()` function
   - Try: `"Save this: http://localhost:8080/admin"` (include text before URL)

## 📝 Example Test Messages

Try these exact messages in your chat/recipe input:

**Should FAIL (blocked):**
```
Save recipe from http://localhost:8080/admin
```

**Should FAIL (blocked):**
```
http://127.0.0.1:3000/test
```

**Should WORK:**
```
Save recipe from https://www.allrecipes.com/recipe/231821/simple-white-cake/
```

---

**The protection is working at the code level** - if you're not seeing it in the UI, it might be:
1. An authentication issue (need to be logged in)
2. The message format isn't triggering URL detection
3. Browser caching old code

Try the steps above and let me know what you see!

