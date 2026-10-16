ALTER TABLE public.business_profiles ADD COLUMN qr_design jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
GRANT SELECT, INSERT ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own requests" ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Users read own requests" ON public.subscription_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins decide requests" ON public.subscription_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.validate_subscription_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.period NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing period';
  END IF;
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = NEW.business_id AND (b.user_id = NEW.user_id OR public.is_admin())) THEN
    RAISE EXCEPTION 'Business does not belong to this user';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER subscription_requests_validate BEFORE INSERT OR UPDATE ON public.subscription_requests FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_request();

CREATE OR REPLACE FUNCTION public.validate_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.period NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing period';
  END IF;
  IF NEW.status NOT IN ('active', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid subscription status';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER subscriptions_validate BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.validate_subscription();