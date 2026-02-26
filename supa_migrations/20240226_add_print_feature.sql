-- Print Photo Selection Feature (Revised)
-- Add print configuration to settings and projects tables

-- Settings: print config
ALTER TABLE settings ADD COLUMN IF NOT EXISTS print_enabled boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS print_templates jsonb DEFAULT '[]';
-- Format: [{"name": "Paket Nikah", "sizes": [{"name": "4R", "quota": 2}, {"name": "5R", "quota": 3}]}, ...]
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_print_expiry_days integer;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS msg_tmpl_link_initial_print jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS msg_tmpl_result_print jsonb;

-- Projects: print state
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'edit';
-- Values: 'edit' | 'print'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_enabled boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_sizes jsonb DEFAULT '[]';
-- Per-project sizes from template or custom: [{"name": "4R", "quota": 2}, ...]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_expires_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_selections jsonb DEFAULT '[]';
-- Format: [{"photo": "RYN05991", "size": "4R"}, ...]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_status text DEFAULT 'pending';
-- Values: pending | in_progress | submitted | reviewed
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_submitted_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS print_last_synced_at timestamptz;
