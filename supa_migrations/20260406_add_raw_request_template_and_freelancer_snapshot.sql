-- Add RAW request template and freelancer snapshot support

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS msg_tmpl_raw_request jsonb DEFAULT '{"id":"","en":""}'::jsonb;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS freelancers_snapshot jsonb DEFAULT '[]'::jsonb;
