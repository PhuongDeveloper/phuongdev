-- ==========================================================================
-- Migration 005: Add views column to content tables
-- ==========================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
