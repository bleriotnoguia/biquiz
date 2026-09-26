-- One report per device and question, and at most eight reports per device each hour.
-- The guard reads existing rows, which anonymous clients cannot, so it runs as the owner.

ALTER TABLE public.question_reports ADD COLUMN device_id uuid;

UPDATE public.question_reports SET device_id = gen_random_uuid() WHERE device_id IS NULL;

ALTER TABLE public.question_reports ALTER COLUMN device_id SET NOT NULL;

CREATE UNIQUE INDEX question_reports_question_device_key
  ON public.question_reports (question_id, device_id);

GRANT INSERT (device_id) ON public.question_reports TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.limit_question_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.question_reports
    WHERE device_id = NEW.device_id
      AND created_at > now() - interval '1 hour'
  ) >= 8 THEN
    RAISE EXCEPTION 'Too many reports' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.limit_question_reports() FROM public;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.limit_question_reports() TO anon, authenticated;

DROP TRIGGER IF EXISTS question_reports_limit ON public.question_reports;
CREATE TRIGGER question_reports_limit
  BEFORE INSERT ON public.question_reports
  FOR EACH ROW
  EXECUTE FUNCTION private.limit_question_reports();
