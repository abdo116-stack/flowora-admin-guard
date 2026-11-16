CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

ALTER TABLE public.business_profiles
  ADD COLUMN booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_settings jsonb NOT NULL DEFAULT '{"timezone":"Africa/Casablanca","minimum_notice_hours":2,"buffer_minutes":0,"slot_interval_minutes":30,"breaks":{}}'::jsonb;

ALTER TABLE public.services
  ADD COLUMN duration_minutes integer;
ALTER TABLE public.services
  ADD CONSTRAINT services_duration_minutes_valid CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 480);

ALTER TABLE public.analytics
  ADD COLUMN source text NOT NULL DEFAULT 'direct',
  ADD COLUMN service_id uuid,
  ADD COLUMN visitor_id text,
  ADD COLUMN category text;
ALTER TABLE public.analytics
  ADD CONSTRAINT analytics_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.analytics
  ADD CONSTRAINT analytics_source_valid CHECK (source IN ('direct','qr'));
ALTER TABLE public.analytics
  ADD CONSTRAINT analytics_visitor_id_valid CHECK (visitor_id IS NULL OR length(visitor_id) <= 80);

CREATE TABLE public.appointment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  note text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz,
  blocked_until timestamptz,
  duration_minutes integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.appointment_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.appointment_requests TO authenticated;
GRANT ALL ON public.appointment_requests TO service_role;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can request appointments for live businesses"
  ON public.appointment_requests FOR INSERT TO anon, authenticated
  WITH CHECK (public.is_public_business(business_id));
CREATE POLICY "Owners and admins can view appointment requests"
  ON public.appointment_requests FOR SELECT TO authenticated
  USING (public.owns_business(business_id) OR public.is_admin());
CREATE POLICY "Owners and admins can manage appointment requests"
  ON public.appointment_requests FOR UPDATE TO authenticated
  USING (public.owns_business(business_id) OR public.is_admin())
  WITH CHECK (public.owns_business(business_id) OR public.is_admin());

CREATE INDEX appointment_requests_business_start_idx
  ON public.appointment_requests (business_id, scheduled_start DESC);
CREATE INDEX appointment_requests_business_status_idx
  ON public.appointment_requests (business_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.booking_slot_is_open(
  p_business_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business public.business_profiles%ROWTYPE;
  v_settings jsonb;
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_day text;
  v_hours text;
  v_match text[];
  v_open time;
  v_close time;
  v_break jsonb;
  v_break_start time;
  v_break_end time;
  v_buffer integer;
  v_notice integer;
BEGIN
  SELECT * INTO v_business FROM public.business_profiles WHERE id = p_business_id;
  IF NOT FOUND OR NOT v_business.published OR NOT v_business.booking_enabled THEN RETURN false; END IF;
  v_settings := v_business.booking_settings;
  v_timezone := COALESCE(NULLIF(v_settings->>'timezone',''), 'Africa/Casablanca');
  v_buffer := GREATEST(0, LEAST(240, COALESCE((v_settings->>'buffer_minutes')::integer, 0)));
  v_notice := GREATEST(0, LEAST(720, COALESCE((v_settings->>'minimum_notice_hours')::integer, 2)));
  IF p_start < now() + make_interval(hours => v_notice) OR p_end <= p_start THEN RETURN false; END IF;

  v_local_start := p_start AT TIME ZONE v_timezone;
  v_local_end := p_end AT TIME ZONE v_timezone;
  IF v_local_start::date <> v_local_end::date THEN RETURN false; END IF;
  v_day := lower(to_char(v_local_start::date, 'FMDay'));
  v_hours := COALESCE(v_business.opening_hours->>v_day, '');
  v_match := regexp_match(v_hours, '^\s*(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\s*$');
  IF v_match IS NULL THEN RETURN false; END IF;
  v_open := make_time(v_match[1]::integer, v_match[2]::integer, 0);
  v_close := make_time(v_match[3]::integer, v_match[4]::integer, 0);
  IF v_local_start::time < v_open OR v_local_end::time > v_close THEN RETURN false; END IF;

  IF jsonb_typeof(v_settings->'breaks'->v_day) = 'array' THEN
    FOR v_break IN SELECT value FROM jsonb_array_elements(v_settings->'breaks'->v_day)
    LOOP
      v_match := regexp_match(COALESCE(v_break->>'start',''), '^(\d{1,2})[:.](\d{2})$');
      IF v_match IS NULL THEN CONTINUE; END IF;
      v_break_start := make_time(v_match[1]::integer, v_match[2]::integer, 0);
      v_match := regexp_match(COALESCE(v_break->>'end',''), '^(\d{1,2})[:.](\d{2})$');
      IF v_match IS NULL THEN CONTINUE; END IF;
      v_break_end := make_time(v_match[1]::integer, v_match[2]::integer, 0);
      IF v_local_start::time < v_break_end AND v_local_end::time > v_break_start THEN RETURN false; END IF;
    END LOOP;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointment_requests r
    WHERE r.business_id = p_business_id
      AND r.status = 'confirmed'
      AND r.id IS DISTINCT FROM p_exclude_id
      AND r.scheduled_start < (p_end + make_interval(mins => v_buffer))
      AND r.blocked_until > p_start
  ) THEN RETURN false; END IF;
  RETURN true;
EXCEPTION WHEN invalid_parameter_value OR datetime_field_overflow THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.booking_slot_is_open(uuid,timestamptz,timestamptz,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_booking_slots(_business_id uuid, _service_id uuid, _date date)
RETURNS TABLE(slot_start timestamptz, duration_minutes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business public.business_profiles%ROWTYPE;
  v_timezone text;
  v_day text;
  v_hours text;
  v_match text[];
  v_open time;
  v_close time;
  v_cursor timestamp;
  v_end timestamp;
  v_duration integer;
  v_step integer;
BEGIN
  SELECT * INTO v_business FROM public.business_profiles WHERE id = _business_id;
  IF NOT FOUND OR NOT v_business.published OR NOT v_business.booking_enabled THEN RETURN; END IF;
  v_timezone := COALESCE(NULLIF(v_business.booking_settings->>'timezone',''), 'Africa/Casablanca');
  IF _date < (now() AT TIME ZONE v_timezone)::date OR _date > (now() AT TIME ZONE v_timezone)::date + 90 THEN RETURN; END IF;
  SELECT COALESCE(s.duration_minutes, 30) INTO v_duration
    FROM public.services s WHERE s.id = _service_id AND s.business_id = _business_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_step := GREATEST(5, LEAST(120, COALESCE((v_business.booking_settings->>'slot_interval_minutes')::integer, 30)));
  v_day := lower(to_char(_date, 'FMDay'));
  v_hours := COALESCE(v_business.opening_hours->>v_day, '');
  v_match := regexp_match(v_hours, '^\s*(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\s*$');
  IF v_match IS NULL THEN RETURN; END IF;
  v_open := make_time(v_match[1]::integer, v_match[2]::integer, 0);
  v_close := make_time(v_match[3]::integer, v_match[4]::integer, 0);
  v_cursor := _date + v_open;
  WHILE v_cursor + make_interval(mins => v_duration) <= _date + v_close LOOP
    v_end := v_cursor + make_interval(mins => v_duration);
    IF public.booking_slot_is_open(_business_id, v_cursor AT TIME ZONE v_timezone, v_end AT TIME ZONE v_timezone) THEN
      slot_start := v_cursor AT TIME ZONE v_timezone;
      duration_minutes := v_duration;
      RETURN NEXT;
    END IF;
    v_cursor := v_cursor + make_interval(mins => v_step);
  END LOOP;
  RETURN;
EXCEPTION WHEN invalid_parameter_value OR datetime_field_overflow THEN
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_booking_slots(uuid,uuid,date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_appointment_request()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business public.business_profiles%ROWTYPE;
  v_duration integer;
  v_buffer integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    IF length(trim(NEW.customer_name)) NOT BETWEEN 1 AND 120 OR length(trim(NEW.customer_phone)) NOT BETWEEN 6 AND 40 THEN
      RAISE EXCEPTION 'Enter a valid name and phone number';
    END IF;
    IF NEW.note IS NOT NULL AND length(NEW.note) > 1000 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  END IF;
  SELECT * INTO v_business FROM public.business_profiles WHERE id = NEW.business_id;
  IF NOT FOUND OR NOT v_business.published OR NOT v_business.booking_enabled THEN
    RAISE EXCEPTION 'Appointments are not available for this portfolio';
  END IF;
  IF NEW.service_id IS NOT NULL THEN
    SELECT COALESCE(s.duration_minutes, 30) INTO v_duration
      FROM public.services s WHERE s.id = NEW.service_id AND s.business_id = NEW.business_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose a service from this portfolio'; END IF;
  ELSE
    v_duration := 30;
  END IF;
  v_buffer := GREATEST(0, LEAST(240, COALESCE((v_business.booking_settings->>'buffer_minutes')::integer, 0)));
  NEW.duration_minutes := v_duration;
  NEW.scheduled_end := NEW.scheduled_start + make_interval(mins => v_duration);
  NEW.blocked_until := NEW.scheduled_end + make_interval(mins => v_buffer);
  IF TG_OP = 'INSERT' OR NEW.scheduled_start IS DISTINCT FROM OLD.scheduled_start OR (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF NOT public.booking_slot_is_open(NEW.business_id, NEW.scheduled_start, NEW.scheduled_end, NEW.id) THEN
      RAISE EXCEPTION 'That time is no longer available. Please choose another slot.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_appointment_request_trg
  BEFORE INSERT OR UPDATE ON public.appointment_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_request();

ALTER TABLE public.appointment_requests
  ADD CONSTRAINT appointment_requests_no_confirmed_overlap
  EXCLUDE USING gist (
    business_id WITH =,
    tstzrange(scheduled_start, blocked_until, '[)') WITH &&
  ) WHERE (status = 'confirmed');

CREATE OR REPLACE FUNCTION public.record_appointment_analytics()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.analytics (business_id, event_type, source, service_id, category)
    VALUES (NEW.business_id, 'booking_request', 'direct', NEW.service_id, 'booking');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      INSERT INTO public.analytics (business_id, event_type, source, service_id, category)
      VALUES (NEW.business_id, 'booking_confirmed', 'direct', NEW.service_id, 'booking');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.analytics (business_id, event_type, source, service_id, category)
      VALUES (NEW.business_id, 'booking_rejected', 'direct', NEW.service_id, 'booking');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER record_appointment_analytics_trg
  AFTER INSERT OR UPDATE ON public.appointment_requests
  FOR EACH ROW EXECUTE FUNCTION public.record_appointment_analytics();

DROP POLICY IF EXISTS "Anyone can record events for live businesses" ON public.analytics;
CREATE POLICY "Visitors can record allowed events for live businesses"
  ON public.analytics FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_public_business(business_id)
    AND source IN ('direct','qr')
    AND event_type IN ('page_view','phone_click','email_click','website_click','instagram_click','facebook_click','tiktok_click','youtube_click','linkedin_click','whatsapp_click','service_whatsapp_click','maps_click','review_click','save_contact')
    AND (service_id IS NULL OR EXISTS (
      SELECT 1 FROM public.services s WHERE s.id = service_id AND s.business_id = analytics.business_id
    ))
  );