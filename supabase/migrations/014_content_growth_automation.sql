-- ===========================================================================
-- Migration 014: SEO provenance and automated RSS content ingestion
-- ===========================================================================

ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_auto_import BOOLEAN NOT NULL DEFAULT FALSE;

-- URL nguồn là khóa idempotency cho cron: một bài từ feed chỉ được nhập một lần.
CREATE UNIQUE INDEX IF NOT EXISTS blogs_source_url_unique_idx
  ON blogs (source_url)
  WHERE source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS blogs_published_updated_idx
  ON blogs (is_published, updated_at DESC);

CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  default_tags TEXT[] NOT NULL DEFAULT '{}',
  limit_per_run INTEGER NOT NULL DEFAULT 3 CHECK (limit_per_run BETWEEN 1 AND 5),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_news_sources_updated_at ON news_sources;
CREATE TRIGGER trigger_news_sources_updated_at
  BEFORE UPDATE ON news_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verified_admin_manage_news_sources" ON news_sources;
CREATE POLICY "verified_admin_manage_news_sources" ON news_sources
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
