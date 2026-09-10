-- Public visibility depends only on "published"
CREATE OR REPLACE FUNCTION public.is_public_business(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles b
    WHERE b.id = _business_id AND b.published = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_public_business(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Public read of live businesses: no profile-status subquery (anon cannot read profiles)
DROP POLICY IF EXISTS "Public can view live businesses" ON public.business_profiles;
CREATE POLICY "Public can view live businesses" ON public.business_profiles
FOR SELECT TO anon, authenticated USING (published = true);

-- Self-service ownership: one portfolio per user
CREATE UNIQUE INDEX IF NOT EXISTS business_profiles_user_id_key ON public.business_profiles(user_id);

DROP POLICY IF EXISTS "Approved owners can update own business" ON public.business_profiles;
CREATE POLICY "Owners can update own business" ON public.business_profiles
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can create own business" ON public.business_profiles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can delete own business" ON public.business_profiles
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Child tables: owners manage their own content without approval
DROP POLICY IF EXISTS "Owners and admins write services" ON public.services;
CREATE POLICY "Owners and admins write services" ON public.services
FOR ALL TO authenticated USING (owns_business(business_id) OR is_admin())
WITH CHECK (owns_business(business_id) OR is_admin());

DROP POLICY IF EXISTS "Owners and admins write gallery" ON public.gallery;
CREATE POLICY "Owners and admins write gallery" ON public.gallery
FOR ALL TO authenticated USING (owns_business(business_id) OR is_admin())
WITH CHECK (owns_business(business_id) OR is_admin());

DROP POLICY IF EXISTS "Owners and admins write offers" ON public.offers;
CREATE POLICY "Owners and admins write offers" ON public.offers
FOR ALL TO authenticated USING (owns_business(business_id) OR is_admin())
WITH CHECK (owns_business(business_id) OR is_admin());

-- New accounts are usable immediately; admin can still suspend/reject
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), 'approved'::public.user_status)
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'makolabdo@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';