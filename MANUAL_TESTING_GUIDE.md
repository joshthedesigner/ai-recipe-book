# Manual Testing Guide - Step by Step

This guide walks you through each manual test with detailed instructions and expected results.

---

## Prerequisites

1. **Dev server running:**
   ```bash
   npm run dev
   ```

2. **Browser open to:** `http://localhost:3000`

3. **Browser DevTools ready:** Press `F12` (or Cmd+Option+I on Mac)

---

## Test 1: Password Policy (Signup Page)

### Step 1.1: Open Signup Page
1. Navigate to: `http://localhost:3000/signup`
2. Fill in Name and Email fields

### Step 1.2: Test Weak Passwords

**Test 1.2a: Too Short (< 12 chars)**
- Password: `Pass123!`
- Confirm: `Pass123!`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password must be at least 12 characters long"
- ✅ **PASS** if you see the error
- ❌ **FAIL** if password is accepted

---

**Test 1.2b: Missing Uppercase**
- Password: `password123!`
- Confirm: `password123!`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password must contain at least one uppercase letter"
- ✅ **PASS** if you see the error

---

**Test 1.2c: Missing Lowercase**
- Password: `PASSWORD123!`
- Confirm: `PASSWORD123!`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password must contain at least one lowercase letter"
- ✅ **PASS** if you see the error

---

**Test 1.2d: Missing Number**
- Password: `PasswordTest!`
- Confirm: `PasswordTest!`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password must contain at least one number"
- ✅ **PASS** if you see the error

---

**Test 1.2e: Missing Special Character**
- Password: `Password123`
- Confirm: `Password123`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password must contain at least one special character"
- ✅ **PASS** if you see the error

---

**Test 1.2f: Common Password**
- Password: `Password123!password`
- Confirm: `Password123!password`
- Click "Sign Up"
- **Expected:** ❌ Error: "Password is too common. Please choose a stronger password."
- ✅ **PASS** if you see the error

---

**Test 1.2g: Valid Strong Password**
- Password: `MySecureP@ssw0rd2024!`
- Confirm: `MySecureP@ssw0rd2024!`
- Fill in Name and Email
- Click "Sign Up"
- **Expected:** ✅ Account created successfully OR email confirmation message
- ✅ **PASS** if account is created

---

### Checklist:
- [ ] Password < 12 chars rejected
- [ ] Missing uppercase rejected
- [ ] Missing lowercase rejected
- [ ] Missing number rejected
- [ ] Missing special char rejected
- [ ] Common password rejected
- [ ] Strong password accepted

---

## Test 2: File Upload Validation

### Step 2.1: Prepare Test Files

Create these test files (or use existing ones):

**For Large File Test (if you have one > 10MB):**
- Use any image file > 10MB

**For Empty File:**
```bash
# In terminal
touch empty.jpg
```

**For Invalid File:**
```bash
# Create fake image
echo "This is not an image" > fake.jpg
```

**For Valid Image:**
- Use any real JPEG/PNG image < 10MB

---

### Step 2.2: Navigate to Upload Area

1. **Log in** to the app
2. Find the image upload area (recipe sidebar or chat)
3. Open **DevTools** (F12) → **Network** tab

---

### Step 2.3: Test Each File Type

**Test 2.3a: File > 10MB**
1. Try to upload a file larger than 10MB
2. **Expected:** ❌ Error: "File size exceeds maximum of 10MB"
3. **Check Network tab:**
   - Status: `400 Bad Request`
   - Response contains error about file size
4. ✅ **PASS** if upload is rejected before processing
5. ❌ **FAIL** if upload proceeds

---

**Test 2.3b: Empty File**
1. Upload `empty.jpg` (or empty file)
2. **Expected:** ❌ Error: "File is empty"
3. **Check Network tab:** Status `400`
4. ✅ **PASS** if rejected

---

**Test 2.3c: Invalid File Type (Fake Image)**
1. Upload `fake.jpg` (text file renamed to .jpg)
2. **Expected:** ❌ Error: "File is not a valid image or is corrupted"
3. **Check Network tab:** Status `400`
4. ✅ **PASS** if rejected (Sharp validates actual content, not just extension)

---

**Test 2.3d: Valid Image**
1. Upload a real JPEG or PNG image (< 10MB)
2. **Expected:** ✅ File processes successfully
3. **Check Network tab:** Status `200`, response contains extracted text
4. ✅ **PASS** if works

---

### Checklist:
- [ ] File > 10MB rejected
- [ ] Empty file rejected
- [ ] Invalid file type rejected
- [ ] Valid image accepted

---

## Test 3: SSRF Protection in Browser

### Step 3.1: Log In
1. Make sure you're logged in to the app
2. Navigate to chat or recipe input area

### Step 3.2: Test Blocked URLs

**Test 3.2a: Localhost URL**
1. Open **DevTools** (F12)
2. Go to **Console** tab
3. In the chat/recipe input, type:
   ```
   Save recipe from http://localhost:8080/admin
   ```
4. Submit/send the message
5. **Expected:** ❌ Error message:
   ```
   Sorry, I couldn't scrape the recipe from that URL. 
   Invalid or unsafe URL. Please provide a valid public HTTP/HTTPS URL.
   
   Try copying and pasting the recipe text instead!
   ```
6. **Check server console** (terminal where `npm run dev` is running):
   - Should see: `Blocked private/internal IP: localhost`
7. ✅ **PASS** if you see the error

---

**Test 3.2b: 127.0.0.1 URL**
1. Try: `Save recipe from http://127.0.0.1:8080/test`
2. **Expected:** Same error message
3. **Check server console:** `Blocked private/internal IP: 127.0.0.1`
4. ✅ **PASS** if blocked

---

**Test 3.2c: Private IP (192.168.x.x)**
1. Try: `Save recipe from http://192.168.1.1/admin`
2. **Expected:** Blocked with error
3. ✅ **PASS** if blocked

---

**Test 3.2d: File Protocol**
1. Try: `Save recipe from file:///etc/passwd`
2. **Expected:** Blocked with error
3. ✅ **PASS** if blocked

---

**Test 3.2e: Valid Public URL**
1. Try: `Save recipe from https://www.allrecipes.com/recipe/231821/simple-white-cake/`
2. **Expected:** ✅ Recipe extracted successfully (or preview shown)
3. ✅ **PASS** if works

---

### Checklist:
- [ ] localhost URL blocked
- [ ] 127.0.0.1 URL blocked
- [ ] 192.168.x.x URL blocked
- [ ] file:// protocol blocked
- [ ] Valid public URL works

---

## Test 4: Client-Side User ID Manipulation

### Step 4.1: Log In as User A
1. Log in to the app
2. Note your user ID (you can find it in browser DevTools → Application → Local Storage, or check Supabase dashboard)

### Step 4.2: Open DevTools Network Tab
1. Press F12 → **Network** tab
2. Clear network log (🚫 icon)
3. Check "Preserve log" checkbox

### Step 4.3: Try to Save a Recipe
1. Type a recipe in the chat/input: `"Save this recipe: Pasta with garlic"`
2. **Before submitting**, set up request interception:
   - Right-click on the request after it appears → "Copy as cURL"
   - Or use browser extension like "Requestly" or "ModHeader"

### Step 4.4: Modify User ID (Optional - Advanced)
**Option A: Using Browser Extension (Recommended)**
1. Install "ModHeader" or "Requestly" extension
2. Intercept requests to `/api/chat` or `/api/recipes/store`
3. Modify request body to change `userId` to a different UUID

**Option B: Manual Verification**
1. Submit the recipe normally
2. Check **Network tab** → Find the request
3. Click on it → **Payload** tab
4. **Verify:** Request should NOT contain `userId` field
5. ✅ **PASS** if userId is not in request body

### Step 4.5: Check Server-Side
1. **Check server console** (terminal):
   - Should see: `User ID from session: [your-user-id]`
   - Should NOT see the userId from request body being used

### Step 4.6: Verify in Database
1. Recipe should be saved under YOUR user ID
2. Not under any manipulated userId from request
3. ✅ **PASS** if recipe is under your actual user ID

---

### Checklist:
- [ ] Request does not include userId from client
- [ ] Server uses session user ID only
- [ ] Recipe saved under correct user ID

---

## Test 5: Authenticated Input Validation

### Step 5.1: Log In
1. Log in to the app
2. Open **DevTools** (F12) → **Network** tab

### Step 5.2: Test SQL Injection in Parameters

**Test 5.2a: Invalid sortBy Parameter**
1. Navigate to recipes/browse page
2. In browser, try URL:
   ```
   http://localhost:3000/api/recipes?sortBy=created_at;DROP%20TABLE%20recipes;--
   ```
3. Or modify the request in Network tab
4. **Expected:** ❌ Error: "Invalid sortBy parameter. Allowed values: created_at, title, contributor_name"
5. **Check Network tab:** Status `400`
6. ✅ **PASS** if error message appears

---

**Test 5.2b: Invalid sortOrder**
1. Try URL: `?sortOrder=evil`
2. **Expected:** ❌ Error: "Invalid sortOrder parameter. Allowed values: asc, desc"
3. ✅ **PASS** if error appears

---

**Test 5.2c: Negative Limit**
1. Try URL: `?limit=-5`
2. **Expected:** ✅ Request succeeds but limit is clamped to 1 (minimum)
3. **Check response:** Should have `limit: 1` in pagination
4. ✅ **PASS** if limit is clamped

---

**Test 5.2d: Very Large Limit**
1. Try URL: `?limit=9999`
2. **Expected:** ✅ Request succeeds but limit is clamped to 100 (maximum)
3. **Check response:** Should have `limit: 100` in pagination
4. ✅ **PASS** if limit is clamped

---

**Test 5.2e: Negative Offset**
1. Try URL: `?offset=-10`
2. **Expected:** ✅ Request succeeds but offset is clamped to 0
3. **Check response:** Should have `offset: 0` in pagination
4. ✅ **PASS** if offset is clamped

---

### Step 5.3: Test Input Length Limits

**Test 5.3a: Long Chat Message**
1. Log in and go to chat
2. Type a message longer than 10,000 characters
   - You can generate one: `"a".repeat(10001)` in browser console
3. Try to send
4. **Expected:** ❌ Error: "Message exceeds maximum length of 10000 characters"
5. ✅ **PASS** if rejected

---

**Test 5.3b: Long Recipe Content**
1. Try to save a recipe with content > 50,000 characters
2. **Expected:** ❌ Error about exceeding length limit
3. ✅ **PASS** if rejected

---

### Checklist:
- [ ] Invalid sortBy rejected
- [ ] Invalid sortOrder rejected
- [ ] Negative limit clamped
- [ ] Large limit clamped
- [ ] Negative offset clamped
- [ ] Long chat message rejected
- [ ] Long recipe content rejected

---

## Quick Test Checklist Summary

Print this and check off as you go:

### Password Policy (7 tests)
- [ ] Too short rejected
- [ ] Missing uppercase rejected
- [ ] Missing lowercase rejected
- [ ] Missing number rejected
- [ ] Missing special char rejected
- [ ] Common password rejected
- [ ] Strong password accepted

### File Upload (4 tests)
- [ ] > 10MB rejected
- [ ] Empty file rejected
- [ ] Invalid file rejected
- [ ] Valid image accepted

### SSRF Protection (5 tests)
- [ ] localhost blocked
- [ ] 127.0.0.1 blocked
- [ ] 192.168.x.x blocked
- [ ] file:// blocked
- [ ] Valid URL works

### User ID Security (3 tests)
- [ ] No userId in request body
- [ ] Server uses session ID
- [ ] Recipe saved under correct user ID

### Input Validation (7 tests)
- [ ] Invalid sortBy rejected
- [ ] Invalid sortOrder rejected
- [ ] Limit clamped
- [ ] Offset clamped
- [ ] Long message rejected
- [ ] Long recipe rejected
- [ ] Parameters sanitized

---

## Troubleshooting

### "Test not working as expected?"

1. **Check you're logged in** - Many tests require authentication
2. **Hard refresh browser** - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Check server console** - Look for error messages
4. **Check browser console** - F12 → Console tab
5. **Restart dev server** - Stop and run `npm run dev` again

### "Can't see error messages?"

1. Check Network tab in DevTools
2. Look at server terminal output
3. Check browser console for errors
4. Verify you're on the correct page

---

## Reporting Results

After completing tests, document:
- ✅ Which tests passed
- ❌ Which tests failed
- 📝 Any unexpected behavior
- 🔍 Screenshots of errors (if helpful)

---

**Good luck with testing! 🧪**


