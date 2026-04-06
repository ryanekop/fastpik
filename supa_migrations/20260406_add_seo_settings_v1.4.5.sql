-- Add SEO settings for public client page (v1.4.5 patch)
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS seo_meta_title text,
ADD COLUMN IF NOT EXISTS seo_meta_description text,
ADD COLUMN IF NOT EXISTS seo_meta_keywords text;
