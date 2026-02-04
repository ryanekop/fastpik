-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create `projects` table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  gdrive_link TEXT NOT NULL,
  client_whatsapp TEXT,
  admin_whatsapp TEXT,
  country_code TEXT DEFAULT '+62',
  max_photos INTEGER DEFAULT 10,
  password TEXT,
  detect_subfolders BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  link TEXT NOT NULL,
  locked_photos TEXT[] DEFAULT '{}',
  -- Legacy support columns (optional, kept for structure consistency with old local interface if needed)
  whatsapp TEXT
);

-- 2. Create `settings` table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE, -- One settings row per user
  default_max_photos INTEGER DEFAULT 10,
  default_country_code TEXT DEFAULT '+62',
  default_expiry_days INTEGER DEFAULT 7,
  default_admin_whatsapp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create `user_sessions` table for Device Limit
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL, -- Will store the refresh token or unique session identifier
  device_info TEXT, -- User Agent or similar identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);


-- 4. Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- PROJECTS
-- Admin can CRUD their own projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Public can READ projects (needed for client view)
-- We might want to restrict this further later, but for now client needs to read project config
CREATE POLICY "Public can read projects" ON projects
  FOR SELECT USING (true);


-- SETTINGS
-- Users can manage their own settings
CREATE POLICY "Users can manage own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);


-- USER SESSIONS
-- Users can see and manage their own sessions
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);


-- 6. Functions & Triggers (Optional: Update `updated_at` automatically)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
