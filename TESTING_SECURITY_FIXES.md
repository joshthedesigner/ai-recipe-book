# Testing Security Fixes Guide

This guide provides step-by-step instructions to test all the security fixes that were implemented.

## Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   ```

2. **Browser DevTools** - Open for network inspection (F12)

3. **Test tools (optional but helpful):**
   - Browser (Chrome/Firefox)
   - `curl` command-line tool
   - Postman or similar API testing tool

---

## 1. Test SSRF Vulnerability Fix

### Test 1.1: Private IP Address Blocking

**What to test:** URLs with private IPs should be blocked

**Steps:**
1. Open the app in browser and log in
2. Navigate to chat or recipe add page
3. Try to save a recipe with these URLs:
   - `http://localhost:8080/admin`
   - `http://127.0.0.1:3306`
   - `http://192.168.1.1/admin`
   - `http://10.0.0.1/secret`

**Expected Result:** 
- Error message: "Invalid or unsafe URL. Please provide a valid public HTTP/HTTPS URL."
- Request should fail before making HTTP request

**Verify in console:**
```bash
# Check server logs - should see "Blocked private/internal IP"
```

### Test 1.2: Non-HTTP(S) Protocol Blocking

**Steps:**
1. Try to save recipe with:
   - `file:///etc/passwd`
   - `ftp://example.com/file`
   - `gopher://example.com`

**Expected Result:** Blocked with same error message

### Test 1.3: Valid Public URL (Should Work)

**Steps:**
1. Try a valid public recipe URL:
   - `https://www.allrecipes.com/recipe/231821/simple-white-cake/`
   - Any public recipe website

**Expected Result:** Should successfully scrape and extract recipe

---

## 2. Test Authentication Checks

### Test 2.1: Unauthenticated Chat API Request

**Method 1: Browser DevTools**
1. Open browser DevTools (F12)
2. Go to Network tab
3. **Log out** of the app (or use incognito window)
4. Navigate to chat page
5. Try to send a message

**Expected Result:**
- Status code: `401 Unauthorized`
- Response: `{"success": false, "error": "Unauthorized. Please log in to continue."}`
- Message should not be sent

**Method 2: curl (Terminal)**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test message"}'
```

**Expected Result:**
```json
{"success":false,"error":"Unauthorized. Please log in to continue."}
```

### Test 2.2: Unauthenticated Recipe API Request

```bash
# Test GET recipes endpoint
curl http://localhost:3000/api/recipes

# Expected: 401 Unauthorized

# Test POST store recipe endpoint
curl -X POST http://localhost:3000/api/recipes/store \
  -H "Content-Type: application/json" \
  -d '{"message": "Save this recipe: Pasta with garlic"}'

# Expected: 401 Unauthorized
```

### Test 2.3: Authenticated Requests (Should Work)

**Steps:**
1. Log in to the app
2. Send a chat message
3. Try to save a recipe

**Expected Result:** All operations should work normally

---

## 3. Test Client-Side User ID Trust Fix

### Test 3.1: Attempt User ID Manipulation

**Steps:**
1. Log in as User A (note your user ID from browser DevTools or Supabase dashboard)
2. Open DevTools Network tab
3. Try to save a recipe
4. Intercept the request and modify the `userId` in the request body
   - In DevTools: Right-click request → "Copy as cURL" → Modify userId
   - Or use a browser extension like "Requestly" to modify requests

**Expected Result:**
- Request should still use YOUR authenticated user ID
- Even if you send different userId in body, server ignores it
- Recipe is saved under your actual user ID, not the manipulated one

**Verify:**
```bash
# Check database - recipe.user_id should match your session user ID
# Not the userId sent in request body
```

### Test 3.2: API Route Doesn't Accept userId

**Check code:**
- Open `app/api/chat/route.ts` - should NOT read `userId` from body
- Open `app/api/recipes/store/route.ts` - should NOT read `userId` from body
- Both should use `user.id` from authenticated session

---

## 4. Test File Upload Validation

### Test 4.1: File Size Limit (10MB)

**Steps:**
1. Log in to app
2. Navigate to recipe upload/image extraction page
3. Try to upload a file larger than 10MB

**Expected Result:**
- Error: "File size exceeds maximum of 10MB"
- Upload rejected before processing
- Check Network tab - request should fail with 400 status

**Create test file:**
```bash
# Create 11MB test file (Mac/Linux)
dd if=/dev/zero of=large-test.jpg bs=1m count=11

# Or use any image file > 10MB
```

### Test 4.2: Empty File

**Steps:**
1. Create empty file: `touch empty.jpg`
2. Try to upload it

**Expected Result:**
- Error: "File is empty"
- Upload rejected

### Test 4.3: Invalid File Type

**Steps:**
1. Create a fake image file:
   ```bash
   echo "This is not an image" > fake.jpg
   ```
2. Try to upload it

**Expected Result:**
- Error: "File is not a valid image or is corrupted"
- Upload rejected (even though extension is .jpg, content validation catches it)

### Test 4.4: Non-Image File with Image Extension

**Steps:**
1. Rename a PDF or text file to `.jpg`
2. Try to upload it

**Expected Result:**
- Error: "File is not a valid image format"
- Sharp library validates actual file content, not just extension

### Test 4.5: Valid Image (Should Work)

**Steps:**
1. Upload a valid JPEG or PNG image (< 10MB)

**Expected Result:**
- Should process successfully
- Text extraction should work

---

## 5. Test Password Policy

### Test 5.1: Password Too Short

**Steps:**
1. Navigate to signup page
2. Enter password: `Password1!` (11 characters)
3. Try to submit

**Expected Result:**
- Error: "Password must be at least 12 characters long"
- Form should not submit

### Test 5.2: Missing Uppercase

**Steps:**
1. Enter password: `password123!` (no uppercase)
2. Try to submit

**Expected Result:**
- Error: "Password must contain at least one uppercase letter"

### Test 5.3: Missing Lowercase

**Steps:**
1. Enter password: `PASSWORD123!` (no lowercase)
2. Try to submit

**Expected Result:**
- Error: "Password must contain at least one lowercase letter"

### Test 5.4: Missing Number

**Steps:**
1. Enter password: `PasswordTest!` (no number)
2. Try to submit

**Expected Result:**
- Error: "Password must contain at least one number"

### Test 5.5: Missing Special Character

**Steps:**
1. Enter password: `Password123` (no special char)
2. Try to submit

**Expected Result:**
- Error: "Password must contain at least one special character"

### Test 5.6: Common Password

**Steps:**
1. Enter password: `Password123!password`
2. Try to submit

**Expected Result:**
- Error: "Password is too common. Please choose a stronger password."

### Test 5.7: Valid Strong Password

**Steps:**
1. Enter password: `MySecureP@ssw0rd2024!`
   - 12+ characters ✅
   - Uppercase ✅
   - Lowercase ✅
   - Number ✅
   - Special char ✅
2. Try to submit

**Expected Result:**
- Should submit successfully
- Account should be created

---

## 6. Test Input Validation & SQL Injection Protection

### Test 6.1: Input Length Limits

**Test Chat Message Length:**
```bash
# Create very long message (> 10,000 chars)
python3 -c "print('a' * 10001)"

# Send via API or browser
```

**Expected Result:**
- Error: "Message exceeds maximum length of 10000 characters"

**Test Recipe Content Length:**
```bash
# Test recipe content (> 50,000 chars)
# Should fail with appropriate error
```

### Test 6.2: SQL Injection in sortBy Parameter

**Steps:**
1. Log in to app
2. Navigate to recipes page
3. Modify URL to:
   ```
   http://localhost:3000/api/recipes?sortBy=created_at; DROP TABLE recipes;--
   ```

**Expected Result:**
- Error: "Invalid sortBy parameter. Allowed values: created_at, title, contributor_name"
- Query should NOT execute
- Whitelist prevents injection

### Test 6.3: Invalid sortOrder

**Steps:**
1. Try URL: `?sortOrder=evil`

**Expected Result:**
- Error: "Invalid sortOrder parameter. Allowed values: asc, desc"

### Test 6.4: Limit Clamping

**Steps:**
1. Try URL: `?limit=-5`
   - Should clamp to minimum 1
2. Try URL: `?limit=999`
   - Should clamp to maximum 100
3. Try URL: `?limit=abc`
   - Should default to 50

**Verify:** Check response - should never have negative or >100 limit

### Test 6.5: Offset Validation

**Steps:**
1. Try URL: `?offset=-10`
   - Should clamp to 0 (minimum)

**Expected Result:**
- Offset should be 0, not negative

---

## 7. Test Security Headers

### Test 7.1: Verify Headers Present

**Method 1: Browser DevTools**
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on any request
5. Check "Response Headers" section

**Expected Headers:**
- `strict-transport-security: max-age=63072000; includeSubDomains; preload`
- `x-frame-options: SAMEORIGIN`
- `x-content-type-options: nosniff`
- `x-xss-protection: 1; mode=block`
- `content-security-policy: ...`

**Method 2: curl**
```bash
curl -I http://localhost:3000

# Should see all security headers in response
```

---

## Automated Testing Script

Create a simple test script to verify some fixes:

```bash
# test-security.sh
#!/bin/bash

echo "Testing Security Fixes..."
echo "=========================="

# Test 1: Unauthenticated API access
echo "1. Testing unauthenticated access..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}')

if [ "$RESPONSE" == "401" ]; then
  echo "✅ PASS: Unauthenticated requests blocked"
else
  echo "❌ FAIL: Expected 401, got $RESPONSE"
fi

# Test 2: SSRF protection (would need to test with actual app)
echo "2. SSRF protection - test manually in browser"
echo "   Try: Save recipe from http://localhost:8080/admin"
echo "   Should see: 'Invalid or unsafe URL'"

echo ""
echo "Run manual tests as described above for complete verification."
```

---

## Quick Testing Checklist

Use this checklist to verify all fixes:

- [ ] SSRF: Private IP blocked (`http://localhost`)
- [ ] SSRF: Non-HTTP protocol blocked (`file://`)
- [ ] SSRF: Valid public URL works
- [ ] Auth: Chat API requires login (401 when not logged in)
- [ ] Auth: Recipe API requires login
- [ ] Auth: Authenticated requests work
- [ ] User ID: Cannot manipulate userId (server uses session)
- [ ] File Upload: 10MB limit enforced
- [ ] File Upload: Empty file rejected
- [ ] File Upload: Invalid file type rejected
- [ ] File Upload: Valid image works
- [ ] Password: < 12 chars rejected
- [ ] Password: Missing complexity rejected
- [ ] Password: Strong password accepted
- [ ] Input: Length limits enforced
- [ ] SQL Injection: Invalid sortBy rejected
- [ ] SQL Injection: Limit/offset clamped
- [ ] Headers: Security headers present

---

## Troubleshooting

### Tests Fail but Code Looks Correct

1. **Clear browser cache** - Headers might be cached
2. **Restart dev server** - `npm run dev` to reload config
3. **Check browser console** - Look for JavaScript errors
4. **Check server logs** - Look for error messages

### Authentication Tests Fail

- Make sure you're actually logged out (check cookies/localStorage)
- Supabase session might persist - clear browser data
- Check if auth tokens are still valid

### File Upload Tests Fail

- Make sure file actually exists and is correct size
- Check file permissions
- Verify Sharp library is installed: `npm list sharp`

---

## Next Steps After Testing

1. ✅ Document any issues found
2. ✅ Verify all fixes work as expected
3. ✅ Test edge cases
4. ⚠️ Implement rate limiting (still pending)
5. ⚠️ Set up monitoring for security events
6. ⚠️ Consider automated security testing in CI/CD

