/*
# Progress photo uploads

Private Supabase Storage bucket for progress photos. Files are stored under
`<client_id>/<file>`; progress_photos.photo_url holds the storage path
(prefixed with "storage:"), and the app shows them through signed URLs.

- Clients can upload, view and delete files in their own folder.
- Trainers can view files of their linked clients.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('progress-photos', 'progress-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "progress_photos_insert_own" ON storage.objects;
CREATE POLICY "progress_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress_photos_select_own_or_trainer" ON storage.objects;
CREATE POLICY "progress_photos_select_own_or_trainer" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.trainer_client_links tcl
        WHERE tcl.trainer_id = auth.uid()
        AND tcl.client_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "progress_photos_delete_own" ON storage.objects;
CREATE POLICY "progress_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
