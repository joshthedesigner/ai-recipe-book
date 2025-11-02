# AI Multi-Agent Recipe Book – System Summary

## Project Overview

You are building a chat-native AI recipe book where users can:

- Add recipes via text, photo, or website link
- Search saved recipes using natural language
- Generate new recipes via AI on demand
- Have casual cooking/meal planning chat

### Key Challenges Solved

- **Intent confusion** — AI misclassifying user actions
- **Recipe hallucination** — AI inventing recipes that don't exist

**Solution:** Separate concerns with a dedicated Intent Classifier + Specialized Agents.

---

## 1️⃣ Intent Classification

**Goal:** Identify what the user wants before any agent acts.

### Supported Intents

| Intent | Meaning | Example Trigger |
|--------|---------|----------------|
| `store_recipe` | User wants to add a recipe | "Here's my grandma's lasagna recipe" |
| `search_recipe` | User wants an existing recipe | "Show me pasta recipes" |
| `generate_recipe` | User wants AI to create a new recipe | "Make a vegan shawarma" |
| `general_chat` | Normal conversation / advice | "What should I cook this week?" |

### Process

1. Call small LLM to classify input into JSON:
```json
{"intent": "search_recipe", "confidence": 0.92}
```

2. If confidence < 0.8, prompt the user to clarify intent
3. Route message to the appropriate agent

---

## 2️⃣ Multi-Agent Architecture

Each agent has a single responsibility:

| Agent | Purpose | Key Rules |
|-------|---------|-----------|
| Intent Classifier | Classifies user messages | JSON output only, no actions |
| Recipe Storage | Extract recipe info & save to DB | Must not invent missing fields; generates embeddings |
| Retrieval Agent | Search vector DB for recipes | No hallucination; asks user if no results |
| Generation Agent | Generate new recipes | Only acts when intent = generate_recipe; never claims recipe exists |
| Chat Agent | Handles general conversation | No DB access |

---

## 3️⃣ Router Logic

- Receives all user messages
- Calls Intent Classifier first
- Routes to correct agent
- Handles low-confidence clarification
- Returns agent output to user

### Pseudocode

```javascript
const intent = await classify(message);

if(intent.confidence < 0.8) {
    return askUserClarifyIntent(message);
}

switch(intent.intent) {
  case "store_recipe": return handleStoreRecipe(message);
  case "search_recipe": return handleRecipeSearch(message);
  case "generate_recipe": return handleRecipeGeneration(message);
  case "general_chat": return handleChat(message);
}
```

---

## 4️⃣ Vector Database + Embeddings

- Supabase Postgres + pgvector for storage of recipe embeddings
- Embeddings generated via `text-embedding-3-large`
- Hybrid search: semantic + keyword search
- Retrieval agent only returns recipes from DB; never invents

---

## 5️⃣ Data Schemas

### Intent JSON

```json
{
  "intent": "search_recipe",
  "confidence": 0.92
}
```

### Recipe JSON

```json
{
  "title": "Garlic Lemon Chicken",
  "ingredients": ["1 lb chicken", "2 cloves garlic", "1 lemon", "Salt", "Pepper"],
  "steps": ["Preheat oven to 400°F", "Mix garlic and lemon", "Bake chicken 25 min"],
  "tags": ["chicken", "dinner", "garlic"],
  "source_url": null,
  "image_url": null
}
```

---

## 6️⃣ File Structure

```
/src
 ├─ agents/
 │   ├─ intentClassifier.ts
 │   ├─ storeRecipe.ts
 │   ├─ searchRecipe.ts
 │   ├─ generateRecipe.ts
 │   └─ chatAgent.ts
 ├─ router.ts
 ├─ db/
 │   └─ supabaseClient.ts
 ├─ vector/
 │   ├─ embed.ts
 │   └─ search.ts
 └─ utils/
     └─ helpers.ts
```

---

## 7️⃣ Hallucination Guardrails

- Never invent recipes in storage or retrieval agents
- Generate recipes only in generation agent
- Low-confidence intents trigger user clarification
- Separate concerns for each agent ensures predictable behavior

---

## 8️⃣ Testing Strategy

Test examples for the intent classifier and agents:

| Input | Expected Behavior |
|-------|-------------------|
| "here's a link to my recipe" | `store_recipe` |
| "find biryani" | `search_recipe` |
| "make biryani" | `generate_recipe` |
| "biryani?" | clarification request |
| "hi" | `general_chat` |

---

## 9️⃣ Benefits of This Approach

- Modular, maintainable, and extensible system
- Clear separation prevents hallucination and mis-routing
- Vector DB + embeddings enable semantic search
- JSON-first design simplifies chat UI integration
- Ready for iterative testing and feature expansion

---

## Next Steps

1. Implement the starter code + agent prompts using the system prompt
2. Wire up Supabase credentials
3. Test intent routing + retrieval + generation flows
4. Add a chat interface for end-user interaction

