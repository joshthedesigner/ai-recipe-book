# Manual Testing Checklist

Copy this checklist and check off items as you test.

## Test Results Template

**Date:** _______________  
**Tester:** _______________  
**Environment:** Development (localhost:3000)

---

## 1. Password Policy Tests (7 tests)

| Test | Password Example | Expected Result | ✅/❌ | Notes |
|------|-----------------|-----------------|-------|-------|
| Too short | `Pass123!` | Rejected: "must be at least 12 characters" | ☐ | |
| Missing uppercase | `password123!` | Rejected: "must contain uppercase" | ☐ | |
| Missing lowercase | `PASSWORD123!` | Rejected: "must contain lowercase" | ☐ | |
| Missing number | `PasswordTest!` | Rejected: "must contain number" | ☐ | |
| Missing special char | `Password123` | Rejected: "must contain special character" | ☐ | |
| Common password | `Password123!password` | Rejected: "too common" | ☐ | |
| Valid strong password | `MySecureP@ssw0rd2024!` | ✅ Accepted | ☐ | |

**Result:** ___ / 7 tests passed

---

## 2. File Upload Validation (4 tests)

| Test | File | Expected Result | ✅/❌ | Notes |
|------|------|-----------------|-------|-------|
| Large file (>10MB) | File > 10MB | Rejected: "exceeds maximum of 10MB" | ☐ | |
| Empty file | Empty file | Rejected: "File is empty" | ☐ | |
| Invalid file type | Text file renamed .jpg | Rejected: "not a valid image" | ☐ | |
| Valid image | Real JPEG/PNG < 10MB | ✅ Accepted & processed | ☐ | |

**Result:** ___ / 4 tests passed

---

## 3. SSRF Protection (5 tests)

| Test | URL | Expected Result | ✅/❌ | Server Log |
|------|-----|-----------------|-------|------------|
| Localhost | `http://localhost:8080/admin` | Blocked: "Invalid or unsafe URL" | ☐ | "Blocked private/internal IP" |
| 127.0.0.1 | `http://127.0.0.1:8080/test` | Blocked | ☐ | "Blocked private/internal IP" |
| Private IP | `http://192.168.1.1/admin` | Blocked | ☐ | "Blocked private/internal IP" |
| File protocol | `file:///etc/passwd` | Blocked | ☐ | "Blocked non-HTTP(S) protocol" |
| Valid public URL | `https://www.allrecipes.com/...` | ✅ Works | ☐ | Success |

**Result:** ___ / 5 tests passed

---

## 4. Client-Side User ID Security (3 tests)

| Test | Action | Expected Result | ✅/❌ | Notes |
|------|--------|-----------------|-------|-------|
| Request body | Check Network tab | No `userId` field in request | ☐ | |
| Server-side | Check server logs | Uses session user ID only | ☐ | |
| Database | Check saved recipe | Recipe under correct user ID | ☐ | |

**Result:** ___ / 3 tests passed

---

## 5. Authenticated Input Validation (7 tests)

| Test | Input | Expected Result | ✅/❌ | Notes |
|------|-------|-----------------|-------|-------|
| Invalid sortBy | `?sortBy=evil;DROP` | Error: "Invalid sortBy parameter" | ☐ | |
| Invalid sortOrder | `?sortOrder=evil` | Error: "Invalid sortOrder parameter" | ☐ | |
| Negative limit | `?limit=-5` | Clamped to 1 | ☐ | Check response |
| Large limit | `?limit=9999` | Clamped to 100 | ☐ | Check response |
| Negative offset | `?offset=-10` | Clamped to 0 | ☐ | Check response |
| Long chat message | >10,000 chars | Rejected: "exceeds maximum length" | ☐ | |
| Long recipe | >50,000 chars | Rejected: "exceeds maximum length" | ☐ | |

**Result:** ___ / 7 tests passed

---

## Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Password Policy | 7 | ___ | ___ |
| File Upload | 4 | ___ | ___ |
| SSRF Protection | 5 | ___ | ___ |
| User ID Security | 3 | ___ | ___ |
| Input Validation | 7 | ___ | ___ |
| **TOTAL** | **26** | **___** | **___** |

---

## Issues Found

### Test: _______________
**Description:**
___________________________________

**Steps to reproduce:**
1. 
2. 
3. 

**Expected:**
___________________________________

**Actual:**
___________________________________

**Screenshot/Logs:**
___________________________________

---

## Notes

___________________________________
___________________________________
___________________________________

---

## Sign-off

**Testing completed by:** _______________  
**Date:** _______________  
**Ready for production:** ☐ Yes  ☐ No

**Comments:**
___________________________________
___________________________________


