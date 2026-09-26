-- Players can report a question. Anyone may insert a report; only admins can read
-- them and change their status.

CREATE TABLE public.question_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('wrong_answer', 'typo', 'bad_reference', 'other')),
  comment text CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 500),
  locale text CHECK (locale IS NULL OR char_length(locale) <= 10),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX question_reports_status_created_at_idx
  ON public.question_reports (status, created_at DESC);

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.question_reports FROM anon, authenticated;
GRANT INSERT (question_id, reason, comment, locale) ON public.question_reports TO anon, authenticated;
GRANT SELECT, UPDATE (status) ON public.question_reports TO authenticated;

CREATE POLICY "Anyone can report a question"
  ON public.question_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'open');

CREATE POLICY "Admins read question reports"
  ON public.question_reports
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "Admins update question reports"
  ON public.question_reports
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.get_question_reports()
RETURNS TABLE (
  id bigint,
  question_id bigint,
  reason text,
  comment text,
  locale text,
  status text,
  created_at timestamptz,
  question_fr text,
  question_en text,
  source_fr text
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    r.id,
    r.question_id,
    r.reason,
    r.comment,
    r.locale,
    r.status,
    r.created_at,
    fr.name,
    en.name,
    fr.source_text
  FROM public.question_reports r
  LEFT JOIN public.question_translations fr ON fr.question_id = r.question_id AND fr.locale = 'fr'
  LEFT JOIN public.question_translations en ON en.question_id = r.question_id AND en.locale = 'en'
  WHERE public.is_admin()
  ORDER BY (r.status = 'open') DESC, r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_question_reports() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_question_reports() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_question_report_status(p_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION 'Unknown report status "%"', p_status;
  END IF;

  UPDATE public.question_reports SET status = p_status WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report % does not exist', p_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_question_report_status(bigint, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_question_report_status(bigint, text) TO authenticated;
