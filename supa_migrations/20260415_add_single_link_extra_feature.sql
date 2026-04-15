ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_enabled boolean DEFAULT false;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_max_photos integer;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_expires_at timestamptz;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_selected_photos text[] DEFAULT '{}';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_status text DEFAULT 'pending';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_submitted_at timestamptz;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS extra_last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_extra_status ON projects(extra_status);
