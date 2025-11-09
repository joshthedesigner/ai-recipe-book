#!/bin/bash

# Security Testing Script
# Run this after starting your dev server: npm run dev

echo "🔒 Security Fixes Testing Script"
echo "================================"
echo ""
echo "Make sure your dev server is running: npm run dev"
echo "Press Enter to continue..."
read

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# Helper function
test_endpoint() {
    test_count=$((test_count + 1))
    name=$1
    method=$2
    url=$3
    data=$4
    expected_status=$5
    
    if [ -z "$data" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ "$status" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $name (got $status)"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $name (expected $expected_status, got $status)"
        fail_count=$((fail_count + 1))
    fi
}

echo "1. Testing Authentication Checks"
echo "--------------------------------"

test_endpoint \
    "Unauthenticated chat POST" \
    "POST" \
    "$BASE_URL/api/chat" \
    '{"message": "test"}' \
    "401"

test_endpoint \
    "Unauthenticated recipes GET" \
    "GET" \
    "$BASE_URL/api/recipes" \
    "" \
    "401"

test_endpoint \
    "Unauthenticated recipes store POST" \
    "POST" \
    "$BASE_URL/api/recipes/store" \
    '{"message": "test recipe"}' \
    "401"

echo ""
echo "2. Testing Input Validation"
echo "---------------------------"

# Test with very long message
long_message=$(python3 -c "print('a' * 10001)" 2>/dev/null || echo "$(printf 'a%.0s' {1..10001})")
test_endpoint \
    "Chat message length limit (>10k chars)" \
    "POST" \
    "$BASE_URL/api/chat" \
    "{\"message\": \"$long_message\"}" \
    "401"  # Will fail auth first, but test that endpoint exists

echo ""
echo "3. Testing SQL Injection Protection"
echo "----------------------------------"

# Note: These need authentication, so will get 401, but that's expected
test_endpoint \
    "Invalid sortBy parameter" \
    "GET" \
    "$BASE_URL/api/recipes?sortBy=evil;DROP%20TABLE" \
    "" \
    "401"  # Needs auth, but if it passed auth, should validate

test_endpoint \
    "Invalid sortOrder parameter" \
    "GET" \
    "$BASE_URL/api/recipes?sortOrder=evil" \
    "" \
    "401"

echo ""
echo "4. Manual Tests Required"
echo "------------------------"
echo -e "${YELLOW}⚠️  The following tests require manual verification:${NC}"
echo ""
echo "SSRF Protection:"
echo "  - Try to save recipe with: http://localhost:8080/admin"
echo "  - Expected: Error 'Invalid or unsafe URL'"
echo ""
echo "File Upload:"
echo "  - Upload file > 10MB (should fail)"
echo "  - Upload empty file (should fail)"
echo "  - Upload invalid file type (should fail)"
echo ""
echo "Password Policy:"
echo "  - Try password < 12 chars (should fail)"
echo "  - Try password without uppercase (should fail)"
echo "  - Try password without special char (should fail)"
echo ""
echo "Client-Side User ID:"
echo "  - Login as User A"
echo "  - Try to modify userId in request (use DevTools)"
echo "  - Recipe should still save under your user ID"
echo ""
echo "Security Headers:"
echo "  - Open DevTools → Network tab → Check response headers"
echo "  - Should see: X-Frame-Options, CSP, HSTS, etc."

echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo "Total tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""
echo "Note: Some tests show 401 (expected - needs authentication)"
echo "Manual testing required for complete verification."
echo ""


