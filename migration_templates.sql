-- Add message template columns to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS msg_tmpl_link_initial JSONB DEFAULT '{"id": "", "en": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS msg_tmpl_link_extra JSONB DEFAULT '{"id": "", "en": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS msg_tmpl_result_initial JSONB DEFAULT '{"id": "", "en": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS msg_tmpl_result_extra JSONB DEFAULT '{"id": "", "en": ""}'::jsonb;
