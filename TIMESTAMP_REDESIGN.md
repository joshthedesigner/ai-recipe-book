# Timestamp Matching System - Complete Redesign
## Goal: 100% Accuracy with Scalability

---

## Core Design Principles

1. **Accuracy First**: Use best available matching technology
2. **Scalable**: Efficient algorithms, caching, batch processing
3. **Cost-Effective**: Smart use of expensive operations (embeddings/AI)
4. **Observable**: Comprehensive logging and metrics
5. **Self-Correcting**: Validation and adjustment mechanisms

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Timestamp Matching Pipeline               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  1. Preprocessing & Normalization   │
        │     - Clean transcript segments    │
        │     - Normalize recipe steps       │
        │     - Extract key phrases          │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  2. Multi-Strategy Matching Engine  │
        │     ┌───────────────────────────┐   │
        │     │ Strategy A: Exact Match    │   │
        │     │ Strategy B: Semantic Match │   │
        │     │ Strategy C: AI Match       │   │
        │     │ Strategy D: Position Fallback│ │
        │     └───────────────────────────┘   │
        │     └─> Voting/Consensus System     │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  3. Chronological Validation        │
        │     - Enforce sequential order      │
        │     - Adjust violations            │
        │     - Validate against video length │
        └─────────────────────────────────────┘
                              ▼
        ┌─────────────────────────────────────┐
        │  4. Confidence Scoring & Quality    │
        │     - Score each match (0-1)        │
        │     - Flag low-confidence matches   │
        │     - Generate quality report       │
        └─────────────────────────────────────┘
                              ▼
        ┌─────────────────────────────────────┐
        │  5. Post-Processing & Optimization  │
        │     - Fill gaps intelligently       │
        │     - Smooth timestamp jumps        │
        │     - Final validation              │
        └─────────────────────────────────────┘
```

---

## Detailed Component Design

### 1. Preprocessing Layer

**Purpose**: Normalize and prepare data for matching

```typescript
interface PreprocessedData {
  steps: PreprocessedStep[];
  segments: PreprocessedSegment[];
  metadata: {
    videoLength: number;
    stepCount: number;
    segmentCount: number;
  };
}

interface PreprocessedStep {
  originalText: string;
  normalizedText: string;
  keyPhrases: string[];      // ["add", "salt", "mix"]
  cookingActions: string[];  // ["add", "mix"]
  ingredients: string[];    // ["salt"]
  index: number;
  estimatedDuration?: number; // Based on step complexity
}

interface PreprocessedSegment {
  originalText: string;
  normalizedText: string;
  startMs: number;
  endMs: number;
  duration: number;
  keyPhrases: string[];
  cookingActions: string[];
  ingredients: string[];
  index: number;
}
```

**Normalization Rules**:
- Lowercase, remove punctuation
- Expand contractions ("don't" → "do not")
- Normalize numbers ("two" → "2")
- Extract cooking verbs: add, mix, heat, cook, stir, chop, etc.
- Extract ingredients: Use NLP or simple pattern matching
- Remove filler words: "now", "then", "so", "well", "um", "uh"

**Key Phrase Extraction**:
- Use part-of-speech tagging (or simple regex)
- Extract verbs (cooking actions)
- Extract nouns (ingredients, tools)
- Create n-grams for phrases

---

### 2. Multi-Strategy Matching Engine

**Purpose**: Try multiple matching strategies and combine results

#### Strategy A: Exact/High-Confidence Text Match
- **When**: First pass, fast matching
- **Method**: Normalized text similarity (Jaro-Winkler, Levenshtein)
- **Threshold**: 0.85+ similarity
- **Cost**: Free (local computation)
- **Speed**: Very fast
- **Accuracy**: High for exact matches

#### Strategy B: Semantic Embedding Match
- **When**: Strategy A fails or low confidence
- **Method**: OpenAI embeddings (text-embedding-3-small)
- **Process**:
  1. Generate embeddings for all steps (batch)
  2. Generate embeddings for all segments (batch)
  3. Calculate cosine similarity matrix
  4. Find best matches with threshold 0.75+
- **Cost**: ~$0.0001 per recipe (1536 dims × 2 arrays)
- **Speed**: ~1-2 seconds (API call)
- **Accuracy**: Very high (handles paraphrasing)

#### Strategy C: AI-Powered Matching
- **When**: Strategies A & B fail, or for validation
- **Method**: GPT-4o-mini with structured output
- **Process**:
  1. Send all steps and segments to GPT
  2. Ask GPT to match each step to best segment(s)
  3. Request confidence score and reasoning
  4. Use structured JSON output
- **Cost**: ~$0.01-0.02 per recipe
- **Speed**: ~3-5 seconds
- **Accuracy**: Highest (understands context)

#### Strategy D: Position-Based Fallback
- **When**: All other strategies fail
- **Method**: Estimate based on step index and video length
- **Formula**: `timestamp = (stepIndex / totalSteps) * videoLength`
- **Validation**: Ensure chronological order
- **Cost**: Free
- **Speed**: Instant
- **Accuracy**: Low but better than nothing

#### Consensus System
```typescript
interface MatchResult {
  stepIndex: number;
  segmentIndex: number;
  timestamp: number;
  confidence: number;
  strategy: 'exact' | 'semantic' | 'ai' | 'position';
  reasoning?: string;
}

interface ConsensusMatch {
  stepIndex: number;
  timestamp: number;
  confidence: number;
  strategies: string[];
  agreement: number; // 0-1, how many strategies agree
}
```

**Voting Logic**:
- If multiple strategies agree → high confidence
- If only one strategy matches → use it with lower confidence
- If strategies disagree → use AI match (most reliable)
- If all fail → use position fallback

---

### 3. Chronological Validation

**Purpose**: Ensure timestamps are always in sequential order

```typescript
function enforceChronologicalOrder(
  matches: MatchResult[],
  videoLength: number
): MatchResult[] {
  const sorted = [...matches].sort((a, b) => a.stepIndex - b.stepIndex);
  const adjusted: MatchResult[] = [];
  
  let lastTimestamp = 0;
  
  for (const match of sorted) {
    // Ensure minimum gap between steps (2 seconds)
    const minTimestamp = lastTimestamp + 2;
    
    if (match.timestamp < minTimestamp) {
      // Adjust to be after previous step
      match.timestamp = minTimestamp;
      match.confidence *= 0.9; // Reduce confidence for adjusted matches
      match.reasoning = `Adjusted for chronological order (was ${match.timestamp}s)`;
    }
    
    // Ensure not beyond video length
    if (match.timestamp > videoLength) {
      match.timestamp = videoLength - 1;
      match.confidence *= 0.8;
      match.reasoning = `Adjusted to video length (was ${match.timestamp}s)`;
    }
    
    adjusted.push(match);
    lastTimestamp = match.timestamp;
  }
  
  return adjusted;
}
```

**Validation Rules**:
1. Step N timestamp >= Step N-1 timestamp + minimum gap (2 seconds)
2. All timestamps < video length
3. All timestamps >= 0
4. No duplicate timestamps (add 1 second if duplicate)

---

### 4. Confidence Scoring & Quality Metrics

**Purpose**: Score each match and generate quality report

```typescript
interface QualityReport {
  overallScore: number;        // 0-1
  matchRate: number;           // % of steps with timestamps
  averageConfidence: number;   // Average confidence of matches
  chronologicalViolations: number;
  lowConfidenceMatches: number;
  strategyDistribution: {
    exact: number;
    semantic: number;
    ai: number;
    position: number;
  };
  recommendations: string[];
}
```

**Confidence Calculation**:
- Base confidence from matching strategy
- Boost if multiple strategies agree
- Reduce if adjusted for chronological order
- Reduce if near video boundaries
- Final confidence: 0-1 scale

**Quality Thresholds**:
- **Excellent**: 90%+ match rate, 0.8+ avg confidence
- **Good**: 70%+ match rate, 0.6+ avg confidence
- **Fair**: 50%+ match rate, 0.4+ avg confidence
- **Poor**: <50% match rate

---

### 5. Post-Processing & Optimization

**Purpose**: Fill gaps and smooth results

#### Gap Filling
```typescript
function fillTimestampGaps(
  matches: MatchResult[],
  totalSteps: number,
  videoLength: number
): MatchResult[] {
  const filled: MatchResult[] = [];
  
  for (let i = 0; i < totalSteps; i++) {
    const existing = matches.find(m => m.stepIndex === i);
    
    if (existing) {
      filled.push(existing);
    } else {
      // Interpolate between surrounding steps
      const prev = filled[filled.length - 1];
      const next = matches.find(m => m.stepIndex > i);
      
      let estimatedTimestamp: number;
      
      if (prev && next) {
        // Interpolate between previous and next
        const gap = next.timestamp - prev.timestamp;
        const stepsBetween = next.stepIndex - prev.stepIndex;
        estimatedTimestamp = prev.timestamp + (gap / stepsBetween);
      } else if (prev) {
        // Estimate based on average step duration
        const avgStepDuration = (videoLength - prev.timestamp) / (totalSteps - i);
        estimatedTimestamp = prev.timestamp + avgStepDuration;
      } else {
        // First step - use position estimate
        estimatedTimestamp = (i / totalSteps) * videoLength;
      }
      
      filled.push({
        stepIndex: i,
        timestamp: estimatedTimestamp,
        confidence: 0.3, // Low confidence for interpolated
        strategy: 'interpolation',
        reasoning: 'Interpolated from surrounding steps'
      });
    }
  }
  
  return filled;
}
```

#### Smoothing
- If timestamp jump > 30 seconds between consecutive steps → flag for review
- Smooth large jumps by averaging with neighbors
- Ensure minimum 2-second gap between steps

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Preprocessing layer
2. ✅ Exact text matching (Strategy A)
3. ✅ Chronological validation
4. ✅ Basic logging

### Phase 2: Semantic Matching (Week 2)
1. ✅ Embedding generation (batch API calls)
2. ✅ Cosine similarity matching (Strategy B)
3. ✅ Consensus system
4. ✅ Quality metrics

### Phase 3: AI Matching & Optimization (Week 3)
1. ✅ AI-powered matching (Strategy C)
2. ✅ Gap filling
3. ✅ Smoothing
4. ✅ Comprehensive quality reports

### Phase 4: Performance & Polish (Week 4)
1. ✅ Caching (cache embeddings for segments)
2. ✅ Batch processing optimization
3. ✅ Error handling & retries
4. ✅ Monitoring & alerts

---

## Scalability Considerations

### 1. Caching Strategy
```typescript
// Cache transcript segment embeddings
// Key: videoId + segmentIndex
// Value: embedding vector
// TTL: 30 days (transcripts don't change)

interface EmbeddingCache {
  videoId: string;
  segmentEmbeddings: number[][];
  cachedAt: Date;
}
```

**Benefits**:
- Reuse embeddings across recipes from same video
- Reduce API calls by 90%+ for popular videos
- Faster processing for cached videos

### 2. Batch Processing
- Generate all step embeddings in one API call
- Generate all segment embeddings in one API call
- Process multiple recipes in parallel (with rate limiting)

### 3. Cost Optimization
- Use embeddings (cheap) as primary strategy
- Only use AI matching (expensive) when needed
- Cache aggressively
- Batch API calls

### 4. Performance Metrics
- Track average processing time
- Track API costs per recipe
- Track cache hit rate
- Track accuracy metrics

---

## Cost Analysis

### Per Recipe (Average 10 steps, 100 segments)

**Without Caching**:
- Embeddings: $0.0001 (step embeddings) + $0.001 (segment embeddings) = $0.0011
- AI matching (if needed): $0.01-0.02
- **Total**: $0.01-0.02 per recipe

**With Caching** (assuming 50% cache hit rate):
- Embeddings: $0.00055 (50% cached)
- AI matching: $0.005 (50% need AI)
- **Total**: ~$0.006 per recipe

**At Scale** (10,000 recipes/month):
- Without caching: $100-200/month
- With caching: ~$60/month
- Acceptable for production

---

## Accuracy Targets

### Match Rate
- **Target**: 95%+ of steps get timestamps
- **Stretch**: 100% (with interpolation fallback)

### Timestamp Accuracy
- **Target**: Within 5 seconds of actual step start
- **Stretch**: Within 2 seconds

### Chronological Order
- **Target**: 100% (always enforced)
- **Stretch**: Natural order (no adjustments needed)

### Quality Score
- **Target**: 0.8+ average confidence
- **Stretch**: 0.9+ average confidence

---

## Monitoring & Observability

### Metrics to Track
1. **Match Rate**: % of steps with timestamps
2. **Average Confidence**: Mean confidence score
3. **Strategy Distribution**: Which strategies are used most
4. **Processing Time**: Time to match all steps
5. **API Costs**: Cost per recipe
6. **Cache Hit Rate**: % of embeddings from cache
7. **Chronological Violations**: How many adjustments needed
8. **Quality Score Distribution**: Histogram of quality scores

### Logging
- Log all matches with confidence scores
- Log strategy used for each step
- Log chronological adjustments
- Log quality report for each recipe

### Alerts
- Alert if match rate < 70%
- Alert if average confidence < 0.5
- Alert if processing time > 10 seconds
- Alert if API costs spike

---

## Testing Strategy

### Unit Tests
- Preprocessing normalization
- Matching algorithms
- Chronological validation
- Gap filling logic

### Integration Tests
- End-to-end matching pipeline
- API integration (embeddings, AI)
- Caching behavior

### Accuracy Tests
- Test with known good videos (manual timestamps)
- Measure accuracy (within X seconds)
- Measure match rate
- Measure chronological correctness

### Performance Tests
- Processing time benchmarks
- API call counts
- Cache effectiveness
- Memory usage

---

## Migration Plan

### Step 1: Build New System (Parallel)
- Implement new matching system
- Keep old system running
- Test with sample videos

### Step 2: A/B Testing
- Run both systems on same videos
- Compare results
- Measure improvement

### Step 3: Gradual Rollout
- Enable for 10% of videos
- Monitor metrics
- Gradually increase to 100%

### Step 4: Deprecate Old System
- Remove old matching code
- Clean up unused functions
- Update documentation

---

## Future Enhancements

1. **User Feedback Loop**
   - Allow users to correct timestamps
   - Learn from corrections
   - Improve matching over time

2. **Video Analysis**
   - Use computer vision to detect cooking actions
   - Cross-reference with transcript matching
   - Higher accuracy for visual steps

3. **Multi-Language Support**
   - Language-specific normalization
   - Language-specific embeddings
   - Language-specific AI prompts

4. **Real-Time Processing**
   - Process timestamps as video is uploaded
   - Show progress to user
   - Stream results

---

## Conclusion

This redesigned system aims for **100% accuracy** through:
1. **Multi-strategy matching** (exact → semantic → AI → fallback)
2. **Comprehensive validation** (chronological, quality checks)
3. **Intelligent gap filling** (interpolation, smoothing)
4. **Observability** (metrics, logging, alerts)

**Scalability** is achieved through:
1. **Caching** (reuse embeddings)
2. **Batch processing** (efficient API usage)
3. **Cost optimization** (use expensive operations only when needed)
4. **Performance monitoring** (track and optimize)

**Expected Results**:
- 95%+ match rate
- 0.8+ average confidence
- 100% chronological correctness
- ~$0.006 per recipe (with caching)
- <5 seconds processing time


