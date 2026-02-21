-- Add selection tracking columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selected_photos TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selection_status TEXT DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selection_submitted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS selection_last_synced_at TIMESTAMPTZ;

-- Index for filtering by selection status
CREATE INDEX IF NOT EXISTS idx_projects_selection_status ON projects(selection_status);
