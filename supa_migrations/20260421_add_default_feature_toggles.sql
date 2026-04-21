ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_selection_enabled boolean DEFAULT true;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_download_enabled boolean DEFAULT true;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_extra_enabled boolean DEFAULT false;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_extra_max_photos integer;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_extra_expiry_days integer;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS default_print_selection_enabled boolean DEFAULT false;

UPDATE settings
SET default_selection_enabled = true
WHERE default_selection_enabled IS NULL;

UPDATE settings
SET default_download_enabled = true
WHERE default_download_enabled IS NULL;

UPDATE settings
SET default_extra_enabled = false
WHERE default_extra_enabled IS NULL;

UPDATE settings
SET default_print_selection_enabled = false
WHERE default_print_selection_enabled IS NULL;
