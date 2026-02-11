-- Create changelogs table
CREATE TABLE IF NOT EXISTS changelogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL,
    changes_en JSONB NOT NULL, -- Structure: [{category: "Feature", items: ["..."]}, ...]
    changes_id JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to changelogs
CREATE POLICY "Allow public read access to changelogs"
ON changelogs FOR SELECT
TO anon, authenticated
USING (true);

-- Allow only service role to insert/update/delete (for now, or authenticated users if we build admin UI for it)
-- For simplicity, we'll allow authenticated users to read. Writing is manual via SQL or future admin UI.
