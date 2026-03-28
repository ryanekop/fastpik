-- Add customizable client action heading text
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS client_choose_action_text jsonb DEFAULT '{"id": "", "en": ""}'::jsonb;
