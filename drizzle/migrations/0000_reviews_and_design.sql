ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS external_review_url text,
  ADD COLUMN IF NOT EXISTS show_review_cta boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_cta text,
  ADD COLUMN IF NOT EXISTS design jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.validate_business_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.google_review_url IS NOT NULL AND NEW.google_review_url <> '' AND NEW.google_review_url !~* '^https://[^\s<>"]+$' THEN
    RAISE EXCEPTION 'Google review link must be a valid https:// URL';
  END IF;
  IF NEW.external_review_url IS NOT NULL AND NEW.external_review_url <> '' AND NEW.external_review_url !~* '^https://[^\s<>"]+$' THEN
    RAISE EXCEPTION 'Review platform link must be a valid https:// URL';
  END IF;
  IF NEW.review_cta IS NOT NULL AND length(NEW.review_cta) > 160 THEN
    RAISE EXCEPTION 'Review message is too long';
  END IF;
  IF jsonb_typeof(NEW.design) <> 'object' OR length(NEW.design::text) > 8000 THEN
    RAISE EXCEPTION 'Invalid design settings';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_business_profile_trg ON public.business_profiles;
CREATE TRIGGER validate_business_profile_trg BEFORE INSERT OR UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_business_profile();