-- Migration: Multi-Tenant SaaS
-- Creates tenants table and links settings to tenants
-- Run this in Supabase Dashboard SQL Editor

-- =============================================
-- TABLE: tenants
-- =============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'fastpik', 'vendor-a'
  name TEXT NOT NULL,                      -- Display name (e.g. 'Ayu Studio Gallery')
  domain TEXT UNIQUE,                      -- 'gallery.ayustudio.com'
  logo_url TEXT,                           -- Logo URL (Supabase Storage or external)
  favicon_url TEXT,                        -- Favicon URL
  primary_color TEXT DEFAULT '#7c3aed',   -- Brand color (hex)
  footer_text TEXT,                        -- Custom footer HTML/text
  is_active BOOLEAN DEFAULT true,         -- Toggle tenant on/off
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Default tenant = Fastpik (your own)
-- =============================================
INSERT INTO tenants (slug, name, domain, logo_url, primary_color, footer_text)
VALUES (
  'fastpik',
  'Fastpik',
  'fastpik.ryanekoapp.web.id',
  '/fastpik-logo.png',
  '#7c3aed',
  NULL
);

-- =============================================
-- Link settings → tenants
-- =============================================
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Assign ALL existing users to the default 'fastpik' tenant
UPDATE settings
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'fastpik')
WHERE tenant_id IS NULL;

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings(tenant_id);

-- =============================================
-- RLS for tenants table
-- =============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Public can read active tenants (needed for middleware tenant resolution)
CREATE POLICY "Public can read active tenants" ON tenants
  FOR SELECT USING (is_active = true);

-- Service role full access (for admin operations)
CREATE POLICY "Service role full access tenants" ON tenants
  FOR ALL USING (true);

-- =============================================
-- Auto-update updated_at
-- =============================================
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
