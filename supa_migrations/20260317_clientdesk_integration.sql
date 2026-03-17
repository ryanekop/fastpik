-- ClientDesk integration support

-- settings: integration credential + sync status
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS clientdesk_integration_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS clientdesk_api_key_id text,
ADD COLUMN IF NOT EXISTS clientdesk_api_key_hash text,
ADD COLUMN IF NOT EXISTS clientdesk_last_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS clientdesk_last_sync_status text,
ADD COLUMN IF NOT EXISTS clientdesk_last_sync_message text;

-- projects: external source metadata for idempotent upsert
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS source_app text,
ADD COLUMN IF NOT EXISTS source_ref_id text,
ADD COLUMN IF NOT EXISTS source_last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_source_ref
ON projects (user_id, source_app, source_ref_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_source_ref
ON projects (user_id, source_app, source_ref_id)
WHERE source_app IS NOT NULL AND source_ref_id IS NOT NULL;

