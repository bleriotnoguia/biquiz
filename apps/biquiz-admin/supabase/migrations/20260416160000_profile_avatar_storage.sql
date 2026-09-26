-- Profile avatars storage bucket and policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  512000,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  CREATE POLICY "Avatars are publicly readable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
EXCEPTION
  WHEN duplicate_object THEN null;
  -- storage.objects is owned by supabase_storage_admin, so the migration role
  -- cannot create policies there (42501). The dashboard may already have done it.
  WHEN insufficient_privilege THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN insufficient_privilege THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN insufficient_privilege THEN null;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN insufficient_privilege THEN null;
END $$;
