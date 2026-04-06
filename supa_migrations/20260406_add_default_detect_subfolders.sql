-- Add default project setting for subfolder detection
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_detect_subfolders boolean DEFAULT false;
