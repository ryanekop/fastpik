-- Create folders table for project organization (up to 5-level nesting)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster folder lookups
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- Add optional folder reference to existing projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);

-- RLS for folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folders" ON folders
  FOR ALL USING (auth.uid() = user_id);
