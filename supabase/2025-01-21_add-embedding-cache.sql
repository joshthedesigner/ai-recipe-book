-- Embedding Cache Table for Timestamp Matching
-- Stores pre-computed embeddings for transcript segments to avoid redundant API calls

CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  segment_index INTEGER NOT NULL,
  embedding VECTOR(1536) NOT NULL, -- text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Ensure one embedding per video segment
  UNIQUE(video_id, segment_index)
);

-- Index for fast lookups by video_id
CREATE INDEX IF NOT EXISTS idx_embedding_cache_video_id ON embedding_cache(video_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires_at ON embedding_cache(expires_at);

-- Index for vector similarity search (if needed in future)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_embedding ON embedding_cache 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Function to automatically set expires_at on insert
CREATE OR REPLACE FUNCTION set_embedding_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiry to 30 days from now (configurable via TIMESTAMP_CACHE_TTL_DAYS env var)
  NEW.expires_at := NOW() + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiry on insert
DROP TRIGGER IF EXISTS trigger_set_embedding_cache_expiry ON embedding_cache;
CREATE TRIGGER trigger_set_embedding_cache_expiry
  BEFORE INSERT ON embedding_cache
  FOR EACH ROW
  EXECUTE FUNCTION set_embedding_cache_expiry();

-- Function to clean up expired entries (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_embeddings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM embedding_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE embedding_cache IS 'Cache for transcript segment embeddings to reduce API costs';
COMMENT ON COLUMN embedding_cache.video_id IS 'YouTube video ID or other video identifier';
COMMENT ON COLUMN embedding_cache.segment_index IS 'Index of the segment within the video transcript';
COMMENT ON COLUMN embedding_cache.embedding IS 'Pre-computed embedding vector (1536 dimensions for text-embedding-3-small)';
COMMENT ON COLUMN embedding_cache.expires_at IS 'When this cache entry expires (default 30 days)';

