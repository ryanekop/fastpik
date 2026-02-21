-- Add Telegram reminder configuration to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_reminder_days INTEGER[] DEFAULT '{7,3}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_reminder_type TEXT DEFAULT 'both' CHECK (telegram_reminder_type IN ('both', 'selection', 'download'));
