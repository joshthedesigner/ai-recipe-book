# Phase 3: Router & Intent Classifier

**Date:** November 1, 2025  
**Status:** ✅ CODE COMPLETE (Waiting for OpenAI API key to test)

---

## What Was Built

### ✅ 1. Type Definitions (`types/index.ts`)
Complete TypeScript types for:
- Intent types: `store_recipe`, `search_recipe`, `generate_recipe`, `general_chat`
- Recipe data structures
- Chat messages and responses
- API request/response formats

### ✅ 2. Intent Classifier (`agents/intentClassifier.ts`)
AI-powered intent classification:
- Uses OpenAI `gpt-4o-mini` for fast, cost-effective classification
- Returns JSON with intent + confidence score (0-1)
- Validates and handles errors gracefully
- Helper functions for confidence checking and clarification

**Key Features:**
- Clear system prompt with examples for each intent type
- Low temperature (0.3) for consistent results
- JSON response format enforced
- Confidence threshold checking (0.8+)

### ✅ 3. Message Router (`router.ts`)
Central routing logic:
- Receives all user messages
- Calls Intent Classifier
- Checks confidence threshold
- Routes to appropriate agent OR requests clarification
- Returns structured responses

**Flow:**
```
User Message → Intent Classifier → Confidence Check → Route to Agent → Response
```

### ✅ 4. Chat API Endpoint (`app/api/chat/route.ts`)
RESTful API for chat:
- `POST /api/chat` - Send messages
- `GET /api/chat` - Health check
- Input validation
- Error handling
- Structured JSON responses

### ✅ 5. Test Script (`scripts/test-intent-classifier.ts`)
Automated testing:
- Tests all 4 intent types
- Includes edge cases from System Summary
- Measures accuracy and confidence
- Provides pass/fail reports

---

## How It Works

### Intent Classification Flow

1. **User sends message:** "Show me pasta recipes"
2. **Router receives message** → Calls Intent Classifier
3. **Intent Classifier** → Sends to OpenAI with system prompt
4. **OpenAI returns:** `{ intent: "search_recipe", confidence: 0.95 }`
5. **Router checks confidence** → 0.95 >= 0.8 ✅
6. **Router routes to Search Agent** (placeholder for Phase 4)
7. **Response sent back to user**

### Low Confidence Handling

If confidence < 0.8:
- System asks for clarification
- Provides helpful examples
- User can restate their request

Example:
```
User: "biryani?"
Classifier: { intent: "search_recipe", confidence: 0.65 }
System: "I'm not sure if you want to search for recipes. If you'd like to find recipes in your collection, please say 'find recipes with biryani' or 'show me biryani recipes'."
```

---

## Files Created

```
/types
  └─ index.ts                        # TypeScript type definitions

/agents
  └─ intentClassifier.ts             # Intent classification agent

/router.ts                            # Main message router

/app/api/chat
  └─ route.ts                        # Chat API endpoint

/scripts
  └─ test-intent-classifier.ts       # Test script
```

---

## 🔑 Action Required: Add OpenAI API Key

To test and use the intent classifier, you need an OpenAI API key.

### Getting Your API Key

1. **Go to OpenAI Platform:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Sign in or create account**
3. **Click "Create new secret key"**
4. **Copy the key** (starts with `sk-proj-...`)
5. **Add to `.env.local`:**
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   ```

### Cost Information

- **Model used:** `gpt-4o-mini`
- **Cost:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Typical usage:** ~100-200 tokens per classification
- **Estimate:** ~$0.0001 per message (very cheap!)

---

## Testing the Intent Classifier

Once you add your OpenAI API key, run:

```bash
cd /Users/jogold/Desktop/recipebook
npx tsx scripts/test-intent-classifier.ts
```

**Expected Results:**
- ✅ ~90%+ accuracy
- ✅ High confidence (0.8+) on clear messages
- ⚠️  Low confidence on ambiguous messages (as intended)

---

## Test Cases

The test script includes messages from the System Summary:

| Message | Expected Intent |
|---------|----------------|
| "here's a link to my recipe" | `store_recipe` |
| "find biryani" | `search_recipe` |
| "make biryani" | `generate_recipe` |
| "hi" | `general_chat` |
| "biryani?" | Low confidence → clarification |

---

## API Usage

### Example Request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me pasta recipes"}'
```

### Example Response

```json
{
  "success": true,
  "response": {
    "message": "🔍 Recipe search agent will handle this (coming in Phase 4)\n\nYour message: \"Show me pasta recipes\"",
    "intent": "search_recipe",
    "confidence": 0.95,
    "needsClarification": false
  }
}
```

---

## What's Next (Phase 4)

Once testing is complete, Phase 4 will implement the specialized agents:
1. **Store Recipe Agent** - Extract and save recipes
2. **Search Recipe Agent** - Vector similarity search
3. **Generate Recipe Agent** - AI recipe creation
4. **Chat Agent** - General conversation

Currently, these return placeholder responses showing which agent would handle the request.

---

## ✅ Phase 3 Checklist

- [x] Type definitions created
- [x] Intent Classifier implemented
- [x] Message Router built
- [x] API endpoint created
- [x] Test script ready
- [ ] OpenAI API key added
- [ ] Tests run successfully

---

## Next Steps

1. **Get OpenAI API key** from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Add key to `.env.local`**
3. **Run test script:** `npx tsx scripts/test-intent-classifier.ts`
4. **Review results** and let me know if ready for Phase 4!

---

**Once your OpenAI key is added and tests pass, Phase 3 is complete!** 🎉

