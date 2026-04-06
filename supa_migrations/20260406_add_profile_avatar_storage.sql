-- Create storage bucket + policies for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Profile avatars are publicly readable'
  ) THEN
    CREATE POLICY "Profile avatars are publicly readable"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'profile-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own profile avatars'
  ) THEN
    CREATE POLICY "Users can upload own profile avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profile-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own profile avatars'
  ) THEN
    CREATE POLICY "Users can update own profile avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'profile-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'profile-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own profile avatars'
  ) THEN
    CREATE POLICY "Users can delete own profile avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profile-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END
$$;
