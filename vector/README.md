# Vector Embeddings Configuration

## Embedding Model

**Model:** OpenAI `text-embedding-3-small`  
**Dimensions:** 1536  
**Cost:** $0.020 / 1M tokens  

## Why text-embedding-3-small?

We use `text-embedding-3-small` instead of `text-embedding-3-large` because:

1. **pgvector Limit:** Supabase's pgvector has a 2000 dimension limit for indexes
2. **Performance:** Smaller vectors = faster similarity search
3. **Cost:** ~5x cheaper than text-embedding-3-large
4. **Accuracy:** Still excellent for recipe search (minor quality difference)

## Usage

When generating embeddings in your code, use:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',  // 1536 dimensions
    input: text,
  });
  
  return response.data[0].embedding;
}
```

## Vector Search

The database includes a `match_recipes()` function that performs cosine similarity search:

```typescript
const { data, error } = await supabase.rpc('match_recipes', {
  query_embedding: embedding,
  match_threshold: 0.7,    // Minimum similarity score (0-1)
  match_count: 10,          // Number of results to return
});
```

## Performance Notes

- **Index Type:** HNSW (Hierarchical Navigable Small World)
- **Distance Metric:** Cosine similarity
- **Optimal for:** Text-based semantic search
- **Query Time:** < 100ms for typical recipe database

## Future Considerations

If Supabase increases the dimension limit or you migrate to a different vector database, you could upgrade to:
- `text-embedding-3-large` (3072 dims) - Better quality
- Custom fine-tuned models - Domain-specific accuracy

For now, `text-embedding-3-small` is the perfect balance of cost, speed, and accuracy for this project.

