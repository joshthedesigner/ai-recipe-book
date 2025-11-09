#!/bin/bash

# Quick verification script for Redis setup

echo "🔍 Verifying Redis Setup"
echo "========================"
echo ""

# Check if packages are installed
if npm list @upstash/ratelimit > /dev/null 2>&1; then
  echo "✅ Upstash packages installed"
else
  echo "❌ Upstash packages not found"
  echo "   Run: npm install @upstash/ratelimit @upstash/redis"
fi

# Check if env vars are set
if [ -f .env.local ]; then
  if grep -q "UPSTASH_REDIS_REST_URL" .env.local; then
    echo "✅ UPSTASH_REDIS_REST_URL found in .env.local"
  else
    echo "❌ UPSTASH_REDIS_REST_URL not found in .env.local"
  fi
  
  if grep -q "UPSTASH_REDIS_REST_TOKEN" .env.local; then
    echo "✅ UPSTASH_REDIS_REST_TOKEN found in .env.local"
  else
    echo "❌ UPSTASH_REDIS_REST_TOKEN not found in .env.local"
  fi
else
  echo "❌ .env.local file not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Restart your dev server:"
echo "   • Stop current server (Ctrl+C)"
echo "   • Run: npm run dev"
echo ""
echo "2. Check server console output:"
echo "   ✅ Should see: '✅ Rate limiting using Redis (Upstash)'"
echo "   ❌ If you see: 'ℹ️  Rate limiting using in-memory storage'"
echo "      → Check env vars are correct and server was restarted"
echo ""
echo "3. Test rate limiting:"
echo "   • Make API requests"
echo "   • Check Upstash dashboard for activity"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


