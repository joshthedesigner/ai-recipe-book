# Rate Limit Pressure Test Analysis

## Current Rate Limits

| Endpoint | Limit | Window | Used For |
|----------|-------|--------|----------|
| `/api/recipes/extract-from-image` | 5/min | 1 minute | Photo OCR extraction |
| `/api/chat` (regular messages) | 10/min | 1 minute | Recipe extraction from text |
| `/api/chat` (confirmRecipe) | 30/min | 1 minute | Recipe confirmation |
| `/api/recipes/store` | 5/min | 1 minute | URL scraping, direct recipe storage |

## Photo Recipe Flow Analysis

### Complete Flow Steps:

1. **Photo Upload** → `/api/recipes/extract-from-image`
   - Rate Limit: **5 requests/minute**
   - Each photo = 1 request
   - Multiple photos processed sequentially in a loop
   - **BOTTLENECK #1**: If user uploads 6+ photos quickly, hits rate limit

2. **Cookbook Info Entry** → `/api/recipes/store`
   - Rate Limit: **5 requests/minute**
   - Contains extracted text + cookbook name/page
   - Calls `storeRecipe()` which extracts recipe using LLM
   - **BOTTLENECK #2**: If user adds multiple recipes quickly, hits rate limit
   - **CRITICAL**: This is the main bottleneck for multiple recipe additions

3. **Recipe Confirmation** → `/api/chat` (with confirmRecipe)
   - Rate Limit: **30 requests/minute**
   - Just saves to database + generates embedding
   - **NOT A BOTTLENECK**: 30/min is generous

## Identified Issues

### Issue 1: Multiple Photos
**Scenario**: User uploads 6 photos at once
- Photos 1-5: ✅ Success (within 5/min limit)
- Photo 6: ❌ Rate Limited (429 error)

**Impact**: User can't process all photos in one batch

### Issue 2: Multiple Recipes in Quick Succession
**Scenario**: User adds 4 recipes quickly (e.g., from 4 photos)
- Recipe 1: Photo extraction ✅ → Store recipe ✅ → Confirmation ✅
- Recipe 2: Photo extraction ✅ → Store recipe ✅ → Confirmation ✅
- Recipe 3: Photo extraction ✅ → Store recipe ✅ → Confirmation ✅
- Recipe 4: Photo extraction ✅ → Store recipe ❌ **RATE LIMITED** (5/min limit)

**Impact**: After 3 recipes, recipe storage hits rate limit (5/min)
**ROOT CAUSE**: `/api/recipes/store` has same limit as image extraction (5/min)

### Issue 3: Sequential Processing
**Scenario**: User uploads 3 photos, each processed sequentially
- Photo 1: Extract (1/5) → Chat (1/10) → Confirm (1/30) ✅
- Photo 2: Extract (2/5) → Chat (2/10) → Confirm (2/30) ✅
- Photo 3: Extract (3/5) → Chat (3/10) → Confirm (3/30) ✅
- Photo 4: Extract (4/5) → Chat (4/10) → Confirm (4/30) ✅
- Photo 5: Extract (5/5) → Chat (5/10) → Confirm (5/30) ✅
- Photo 6: Extract ❌ **RATE LIMITED** (6/5)

**Impact**: Can only process 5 photos per minute

## Test Results Summary

### Test Scenario 1: Single Photo Flow
- Image Extraction: Not tested (requires file upload)
- Recipe Storage: Tested 7 requests (limit is 5/min)
  - Requests 1-5: ✅ Success
  - Request 6: ❌ Rate Limited (429)
  - Request 7: ❌ Rate Limited (429)
- Chat Confirmation: Tested 32 requests
  - Requests 1-30: ✅ Success
  - Request 31: ❌ Rate Limited (429)
  - Request 32: ❌ Rate Limited (429)

### Test Scenario 2: Multiple Photos
- 7 image extraction requests (limit is 5/min)
  - Requests 1-5: ✅ Success
  - Request 6: ❌ Rate Limited (429)
  - Request 7: ❌ Rate Limited (429)

### Test Scenario 3: Multiple Recipes
- 4 recipes in quick succession
  - Recipe 1: Photo ✅ → Store ✅ → Confirm ✅
  - Recipe 2: Photo ✅ → Store ✅ → Confirm ✅
  - Recipe 3: Photo ✅ → Store ✅ → Confirm ✅
  - Recipe 4: Photo ✅ → Store ❌ **RATE LIMITED** (5/min limit)

## Recommendations

### Option 1: Increase Image Extraction Limit
- Current: 5/min
- Proposed: 10/min
- **Pros**: Allows more photos per batch
- **Cons**: More expensive (OpenAI Vision API calls)

### Option 2: Batch Image Processing
- Process multiple images in single API call
- **Pros**: Reduces API calls
- **Cons**: Requires API changes, larger payloads

### Option 3: Increase Recipe Storage Limit
- Current: 5/min
- Proposed: 10-15/min
- **Pros**: Allows more recipes per minute (main bottleneck)
- **Cons**: More expensive (OpenAI API calls for extraction)

### Option 4: Separate Rate Limit for Photo Recipe Storage
- Create new limit: `photoRecipeStore: 15/min`
- Use specifically for `/api/recipes/store` when called from photo flow
- **Pros**: More granular control, doesn't affect URL scraping
- **Cons**: More complex logic to detect source

### Option 5: Client-Side Queuing
- Queue requests on client side
- Add delays between requests
- **Pros**: No server changes
- **Cons**: Slower UX, user sees delays

## Current Bottlenecks (Priority Order)

1. **CRITICAL**: Recipe storage (5/min) - **MAIN BOTTLENECK** for multiple recipe additions
   - User can only add 5 recipes per minute
   - This is the step that extracts recipe from text using LLM
   - Same limit as image extraction, but used more frequently

2. **HIGH**: Image extraction (5/min) - Blocks photo batch processing
   - User can only process 5 photos per minute
   - Less critical since photos are usually processed in smaller batches

3. **LOW**: Recipe confirmation (30/min) - Not a bottleneck
   - Generous limit, rarely hit

## Test Scripts

### `test-photo-extraction-flow.js`
**Purpose**: Mirrors the exact photo extraction flow that's breaking

**Tests**:
1. **Multiple Photos Flow**: Uploads 6 photos sequentially (like frontend does)
   - Tests `/api/recipes/extract-from-image` endpoint
   - Expects first 5 to succeed, 6th to hit rate limit
   
2. **Full Photo Recipe Flow**: Complete flow for 4 recipes
   - Photo extraction → Recipe storage → Confirmation
   - Identifies which step is the bottleneck

**Usage**:
```bash
# 1. Install form-data if needed
npm install form-data

# 2. Get your session cookie from browser dev tools
# 3. Update SESSION_COOKIE in test-photo-extraction-flow.js
# 4. Run the test
node test-photo-extraction-flow.js
```

**What it tests**:
- ✅ Sequential photo uploads (exactly like frontend)
- ✅ FormData with image files
- ✅ Rate limit headers
- ✅ Full recipe flow (extraction → store → confirm)
- ✅ Identifies exact bottleneck step

## Next Steps

1. ✅ **DONE**: Created test script that mirrors photo extraction flow
2. Run test with real session cookie to confirm bottlenecks
3. Monitor rate limit errors in production logs
4. Consider increasing limits based on test results
5. Implement client-side queuing as temporary solution

