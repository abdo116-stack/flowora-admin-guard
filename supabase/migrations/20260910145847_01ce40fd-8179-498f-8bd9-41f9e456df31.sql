DROP POLICY IF EXISTS "Signed-in users can upload business media" ON storage.objects;
CREATE POLICY "Signed-in users can upload business media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-media');