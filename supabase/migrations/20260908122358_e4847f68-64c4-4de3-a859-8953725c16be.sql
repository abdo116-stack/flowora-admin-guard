CREATE POLICY "Anyone can view business media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'business-media');
CREATE POLICY "Signed-in users can upload business media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-media' AND (public.is_admin() OR public.is_approved()));
CREATE POLICY "Owners and admins can update business media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'business-media' AND (public.is_admin() OR owner = auth.uid()));
CREATE POLICY "Owners and admins can delete business media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'business-media' AND (public.is_admin() OR owner = auth.uid()));