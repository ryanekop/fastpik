-- Add separate reminder templates for extra photos and print projects
ALTER TABLE settings ADD COLUMN IF NOT EXISTS msg_tmpl_reminder_extra jsonb;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS msg_tmpl_reminder_print jsonb;
