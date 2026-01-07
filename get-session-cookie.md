# How to Get Session Cookie for Testing

## Quick Method (Browser Dev Tools)

1. **Open your app**: http://localhost:3000
2. **Log in** to your account
3. **Open Dev Tools**: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
4. **Go to Application/Storage tab**:
   - Chrome/Edge: Application → Cookies → http://localhost:3000
   - Firefox: Storage → Cookies → http://localhost:3000
   - Safari: Storage → Cookies → http://localhost:3000
5. **Find the Supabase auth cookie**:
   - Look for cookies starting with `sb-` (e.g., `sb-xxxxx-auth-token`)
   - Or look for cookies with names like `sb-<project-id>-auth-token`
6. **Copy the cookie value**:
   - Right-click the cookie → Copy → Copy Value
   - Or manually copy the entire value

## Format for Test Script

The cookie format should be:
```
sb-xxxxx-auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or if there are multiple cookies, combine them with semicolons:
```
sb-xxxxx-auth-token=eyJ...; sb-xxxxx-auth-token.0=eyJ...
```

## Update Test Script

Open `test-photo-extraction-flow.js` and replace:
```javascript
const SESSION_COOKIE = 'YOUR_SESSION_COOKIE_HERE';
```

With:
```javascript
const SESSION_COOKIE = 'sb-xxxxx-auth-token=eyJ...'; // Your actual cookie
```

## Alternative: Use Browser Console

You can also get it from the browser console:

1. Open Dev Tools → Console tab
2. Run:
```javascript
document.cookie
```
3. Copy the relevant cookie values

