ALTER TABLE projects
ADD COLUMN IF NOT EXISTS selection_enabled boolean DEFAULT true;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS download_enabled boolean DEFAULT true;

UPDATE projects
SET selection_enabled = true
WHERE selection_enabled IS NULL;

UPDATE projects
SET download_enabled = true
WHERE download_enabled IS NULL;
