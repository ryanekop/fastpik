-- Migration: Add vendor_name column to settings table
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE settings ADD COLUMN IF NOT EXISTS vendor_name TEXT;
