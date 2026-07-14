-- ==========================================================================
-- Migration 009: Add RPC for incrementing views
-- ==========================================================================

CREATE OR REPLACE FUNCTION increment_views(table_name text, row_slug text)
RETURNS void AS $$
BEGIN
  IF table_name NOT IN ('products', 'blogs', 'services', 'projects') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;
  
  EXECUTE format('UPDATE %I SET views = views + 1 WHERE slug = %L', table_name, row_slug);
END;
$$ LANGUAGE plpgsql;
