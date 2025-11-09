#!/bin/bash

# Performance Testing Script
echo "🚀 Performance Testing Suite"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Homepage Load Time
echo "📊 Test 1: Homepage Load Time"
echo "----------------------------"
HOME_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000 2>&1)
echo "Response time: ${HOME_TIME}s"
if (( $(echo "$HOME_TIME < 1.0" | bc -l) )); then
  echo -e "${GREEN}✅ Good (< 1.0s)${NC}"
elif (( $(echo "$HOME_TIME < 2.0" | bc -l) )); then
  echo -e "${YELLOW}⚠️  Acceptable (1-2s)${NC}"
else
  echo -e "${RED}❌ Slow (> 2s)${NC}"
fi
echo ""

# Test 2: API Endpoint Response Time
echo "📊 Test 2: API Endpoint (/api/recipes)"
echo "--------------------------------------"
API_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/api/recipes 2>&1)
echo "Response time: ${API_TIME}s"
if (( $(echo "$API_TIME < 0.5" | bc -l) )); then
  echo -e "${GREEN}✅ Fast (< 0.5s)${NC}"
elif (( $(echo "$API_TIME < 1.0" | bc -l) )); then
  echo -e "${YELLOW}⚠️  Acceptable (0.5-1.0s)${NC}"
else
  echo -e "${RED}❌ Slow (> 1.0s)${NC}"
fi
echo ""

# Test 3: Response Size
echo "📊 Test 3: API Response Size"
echo "----------------------------"
API_SIZE=$(curl -w "%{size_download}" -o /dev/null -s http://localhost:3000/api/recipes 2>&1)
API_SIZE_KB=$(echo "scale=2; $API_SIZE / 1024" | bc)
echo "Size: ${API_SIZE} bytes (${API_SIZE_KB} KB)"
if (( $(echo "$API_SIZE < 50000" | bc -l) )); then
  echo -e "${GREEN}✅ Good (< 50KB)${NC}"
elif (( $(echo "$API_SIZE < 200000" | bc -l) )); then
  echo -e "${YELLOW}⚠️  Acceptable (50-200KB)${NC}"
else
  echo -e "${RED}❌ Large (> 200KB)${NC}"
  echo "   Consider: Excluding embedding vectors (if not already done)"
fi
echo ""

# Test 4: Multiple Requests (Warm-up Test)
echo "📊 Test 4: Cache Effectiveness (5 requests)"
echo "-------------------------------------------"
TIMES=()
for i in {1..5}; do
  TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/api/recipes 2>&1)
  TIMES+=($TIME)
  echo "Request $i: ${TIME}s"
done

FIRST=${TIMES[0]}
LAST=${TIMES[4]}
IMPROVEMENT=$(echo "scale=1; (($FIRST - $LAST) / $FIRST) * 100" | bc)
echo ""
echo "First request: ${FIRST}s"
echo "Last request: ${LAST}s"
echo "Improvement: ${IMPROVEMENT}%"
if (( $(echo "$IMPROVEMENT > 50" | bc -l) )); then
  echo -e "${GREEN}✅ Good caching effect${NC}"
else
  echo -e "${YELLOW}⚠️  Limited caching effect${NC}"
fi
echo ""

# Test 5: Server Resources Check
echo "📊 Test 5: Server Process Check"
echo "-------------------------------"
if pgrep -f "next dev" > /dev/null; then
  PID=$(pgrep -f "next dev" | head -1)
  MEM=$(ps -p $PID -o rss= 2>/dev/null | awk '{print $1/1024}')
  CPU=$(ps -p $PID -o %cpu= 2>/dev/null)
  if [ ! -z "$MEM" ]; then
    echo "Memory usage: ${MEM} MB"
  fi
  if [ ! -z "$CPU" ]; then
    echo "CPU usage: ${CPU}%"
  fi
else
  echo "⚠️  Next.js dev server not found"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Performance Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Homepage: ${HOME_TIME}s"
echo "API (/api/recipes): ${API_TIME}s"
echo "API Size: ${API_SIZE_KB} KB"
echo ""
echo "💡 Recommendations:"
if (( $(echo "$HOME_TIME > 1.5" | bc -l) )); then
  echo "  • Consider Next.js Image optimization"
  echo "  • Check for blocking JavaScript"
  echo "  • Review client-side bundle size"
fi
if (( $(echo "$API_TIME > 0.8" | bc -l) )); then
  echo "  • Check database query performance"
  echo "  • Verify cache headers are working"
  echo "  • Consider database indexing"
fi
if (( $(echo "$API_SIZE > 200000" | bc -l) )); then
  echo "  • Exclude embedding vectors from queries"
  echo "  • Implement pagination"
  echo "  • Consider compression"
fi


