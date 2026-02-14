-- Migration: Add dashboard_duration_display column to settings table
-- Values: 'selection' (default) | 'download'

ALTER TABLE settings ADD COLUMN IF NOT EXISTS dashboard_duration_display TEXT DEFAULT 'selection';
