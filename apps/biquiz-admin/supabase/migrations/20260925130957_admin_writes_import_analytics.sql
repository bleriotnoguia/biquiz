-- Admin role, working write RPCs, bulk question import and anonymous app analytics.

-- ============================================================
-- ADMINS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own row" ON public.admin_users;
CREATE POLICY "Admins read own row"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Auth signups are open, so only the accounts that exist when this runs are promoted.
-- Add further admins manually: INSERT INTO public.admin_users (user_id) VALUES ('<uuid>');
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Content tables: public read (existing policies), admin-only writes.
DO $$
DECLARE
  t text;
  op text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'question_categories',
    'question_category_translations',
    'questions',
    'question_translations',
    'question_options',
    'question_option_translations',
    'question_types',
    'question_type_translations'
  ] LOOP
    FOREACH op IN ARRAY ARRAY['insert', 'update', 'delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin ' || op || ' ' || t, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()))',
      'Admin insert ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()))',
      'Admin update ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_admin()))',
      'Admin delete ' || t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- QUESTION WRITE RPCs (names expected by the admin app)
-- ============================================================

DROP FUNCTION IF EXISTS public.insert_question_dataa(jsonb);
DROP FUNCTION IF EXISTS public.update_question_dataa(jsonb);
DROP FUNCTION IF EXISTS public.update_question_datata(jsonb);

CREATE OR REPLACE FUNCTION public.insert_question_data(p_data jsonb)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_question_id bigint;
  v_option_id bigint;
  v_option jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.questions (is_active, question_category_id, question_type_id)
  VALUES (
    COALESCE((p_data->>'is_active')::boolean, true),
    (p_data->>'category_id')::bigint,
    COALESCE((p_data->>'type_id')::bigint, 1)
  )
  RETURNING id INTO v_question_id;

  INSERT INTO public.question_translations (question_id, locale, name, source_text)
  VALUES
    (v_question_id, 'en', COALESCE(p_data->>'name_en', ''), COALESCE(p_data->>'source_text_en', '')),
    (v_question_id, 'fr', COALESCE(p_data->>'name_fr', ''), COALESCE(p_data->>'source_text_fr', ''));

  FOR v_option IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'options', '[]'::jsonb)) LOOP
    INSERT INTO public.question_options (question_id, is_correct)
    VALUES (v_question_id, COALESCE((v_option->>'is_correct')::boolean, false))
    RETURNING id INTO v_option_id;

    INSERT INTO public.question_option_translations (question_option_id, locale, name)
    VALUES
      (v_option_id, 'en', v_option->>'name_en'),
      (v_option_id, 'fr', v_option->>'name_fr');
  END LOOP;

  RETURN v_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_question_data(p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_id bigint := (p_data->>'id')::bigint;
  v_option jsonb;
  v_option_id bigint;
  v_locale text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.questions
  SET
    is_active = COALESCE((p_data->>'is_active')::boolean, is_active),
    question_category_id = COALESCE((p_data->>'category_id')::bigint, question_category_id),
    question_type_id = COALESCE((p_data->>'type_id')::bigint, question_type_id),
    updated_at = now()
  WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % not found', v_id;
  END IF;

  FOREACH v_locale IN ARRAY ARRAY['en', 'fr'] LOOP
    UPDATE public.question_translations
    SET
      name = COALESCE(p_data->>('name_' || v_locale), ''),
      source_text = COALESCE(p_data->>('source_text_' || v_locale), ''),
      updated_at = now()
    WHERE question_id = v_id AND locale = v_locale;

    IF NOT FOUND THEN
      INSERT INTO public.question_translations (question_id, locale, name, source_text)
      VALUES (
        v_id,
        v_locale,
        COALESCE(p_data->>('name_' || v_locale), ''),
        COALESCE(p_data->>('source_text_' || v_locale), '')
      );
    END IF;
  END LOOP;

  FOR v_option IN SELECT * FROM jsonb_array_elements(COALESCE(p_data->'options', '[]'::jsonb)) LOOP
    v_option_id := (v_option->>'id')::bigint;

    IF v_option_id IS NULL THEN
      INSERT INTO public.question_options (question_id, is_correct)
      VALUES (v_id, COALESCE((v_option->>'is_correct')::boolean, false))
      RETURNING id INTO v_option_id;
    ELSE
      UPDATE public.question_options
      SET is_correct = COALESCE((v_option->>'is_correct')::boolean, false), updated_at = now()
      WHERE id = v_option_id AND question_id = v_id;
    END IF;

    FOREACH v_locale IN ARRAY ARRAY['en', 'fr'] LOOP
      UPDATE public.question_option_translations
      SET name = v_option->>('name_' || v_locale), updated_at = now()
      WHERE question_option_id = v_option_id AND locale = v_locale;

      IF NOT FOUND THEN
        INSERT INTO public.question_option_translations (question_option_id, locale, name)
        VALUES (v_option_id, v_locale, v_option->>('name_' || v_locale));
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- The parameter keeps its original name (called with { question_id }), so it is
-- referenced through the function name to avoid ambiguity with the columns.
CREATE OR REPLACE FUNCTION public.delete_question_data(question_id integer)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.question_option_translations qot
  USING public.question_options qo
  WHERE qot.question_option_id = qo.id
    AND qo.question_id = delete_question_data.question_id;

  DELETE FROM public.question_options qo WHERE qo.question_id = delete_question_data.question_id;
  DELETE FROM public.question_translations qt WHERE qt.question_id = delete_question_data.question_id;
  DELETE FROM public.questions q WHERE q.id = delete_question_data.question_id;
END;
$$;

-- ============================================================
-- BULK IMPORT
-- ============================================================
-- Payload: { "themes": [ { "category_id"?, "name_fr", "name_en"?, "level"?,
--   "questions": [ { "name_fr", "name_en"?, "source_text_fr"?, "source_text_en"?,
--     "options": [ { "name_fr", "name_en"?, "is_correct" } ] } ] } ] }
-- Missing English values fall back to French. Themes are matched by name (fr or en)
-- and created when absent. Questions already present in the theme (same French
-- wording) are skipped. Any validation error rolls back the whole import.

CREATE OR REPLACE FUNCTION public.import_questions(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_theme jsonb;
  v_question jsonb;
  v_options jsonb;
  v_category_id bigint;
  v_theme_fr text;
  v_theme_en text;
  v_theme_label text;
  v_q_fr text;
  v_q_en text;
  v_source_fr text;
  v_correct integer;
  v_theme_idx integer := 0;
  v_q_idx integer;
  v_categories_created integer := 0;
  v_inserted integer := 0;
  v_skipped integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_payload->'themes') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Payload must contain a "themes" array';
  END IF;

  FOR v_theme IN SELECT * FROM jsonb_array_elements(p_payload->'themes') LOOP
    v_theme_idx := v_theme_idx + 1;
    v_theme_fr := NULLIF(btrim(v_theme->>'name_fr'), '');
    v_theme_en := COALESCE(NULLIF(btrim(v_theme->>'name_en'), ''), v_theme_fr);
    v_theme_label := COALESCE(v_theme_fr, '#' || v_theme_idx);
    v_category_id := NULLIF(v_theme->>'category_id', '')::bigint;

    IF v_category_id IS NOT NULL THEN
      PERFORM 1 FROM public.question_categories WHERE id = v_category_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Theme %: category % does not exist', v_theme_label, v_category_id;
      END IF;
    ELSE
      IF v_theme_fr IS NULL THEN
        RAISE EXCEPTION 'Theme #%: name_fr is required', v_theme_idx;
      END IF;

      SELECT t.question_category_id INTO v_category_id
      FROM public.question_category_translations t
      WHERE lower(btrim(t.name)) IN (lower(v_theme_fr), lower(v_theme_en))
      ORDER BY (t.locale = 'fr') DESC
      LIMIT 1;

      IF v_category_id IS NULL THEN
        INSERT INTO public.question_categories (level, is_active)
        VALUES (
          COALESCE(
            NULLIF(v_theme->>'level', '')::integer,
            (SELECT COALESCE(max(level), 0) + 1 FROM public.question_categories)
          ),
          true
        )
        RETURNING id INTO v_category_id;

        INSERT INTO public.question_category_translations (question_category_id, locale, name)
        VALUES (v_category_id, 'fr', v_theme_fr), (v_category_id, 'en', v_theme_en);

        v_categories_created := v_categories_created + 1;
      END IF;
    END IF;

    v_q_idx := 0;
    FOR v_question IN SELECT * FROM jsonb_array_elements(COALESCE(v_theme->'questions', '[]'::jsonb)) LOOP
      v_q_idx := v_q_idx + 1;
      v_q_fr := NULLIF(btrim(v_question->>'name_fr'), '');
      v_q_en := COALESCE(NULLIF(btrim(v_question->>'name_en'), ''), v_q_fr);
      v_source_fr := COALESCE(btrim(v_question->>'source_text_fr'), '');
      v_options := COALESCE(v_question->'options', '[]'::jsonb);

      IF v_q_fr IS NULL THEN
        RAISE EXCEPTION 'Theme %, question #%: name_fr is required', v_theme_label, v_q_idx;
      END IF;

      IF jsonb_typeof(v_options) <> 'array' OR jsonb_array_length(v_options) < 2 THEN
        RAISE EXCEPTION 'Theme %, question #%: at least 2 options are required', v_theme_label, v_q_idx;
      END IF;

      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_options) o
        WHERE NULLIF(btrim(o->>'name_fr'), '') IS NULL
      ) THEN
        RAISE EXCEPTION 'Theme %, question #%: every option needs a name_fr', v_theme_label, v_q_idx;
      END IF;

      SELECT count(*) INTO v_correct
      FROM jsonb_array_elements(v_options) o
      WHERE COALESCE((o->>'is_correct')::boolean, false);

      IF v_correct <> 1 THEN
        RAISE EXCEPTION 'Theme %, question #%: exactly one correct option expected (found %)',
          v_theme_label, v_q_idx, v_correct;
      END IF;

      PERFORM 1
      FROM public.questions q
      JOIN public.question_translations qt ON qt.question_id = q.id AND qt.locale = 'fr'
      WHERE q.question_category_id = v_category_id
        AND lower(btrim(qt.name)) = lower(v_q_fr);

      IF FOUND THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      PERFORM public.insert_question_data(jsonb_build_object(
        'name_fr', v_q_fr,
        'name_en', v_q_en,
        'source_text_fr', v_source_fr,
        'source_text_en', COALESCE(NULLIF(btrim(v_question->>'source_text_en'), ''), v_source_fr),
        'is_active', true,
        'category_id', v_category_id,
        'type_id', 1,
        'options', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name_fr', btrim(e.o->>'name_fr'),
              'name_en', COALESCE(NULLIF(btrim(e.o->>'name_en'), ''), btrim(e.o->>'name_fr')),
              'is_correct', COALESCE((e.o->>'is_correct')::boolean, false)
            )
            ORDER BY e.ord
          )
          FROM jsonb_array_elements(v_options) WITH ORDINALITY AS e(o, ord)
        )
      ));

      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'categories_created', v_categories_created,
    'questions_inserted', v_inserted,
    'questions_skipped', v_skipped
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.insert_question_data(jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.update_question_data(jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.delete_question_data(integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.import_questions(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.insert_question_data(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_question_data(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_question_data(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_questions(jsonb) TO authenticated;

-- ============================================================
-- ANONYMOUS APP ANALYTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('app_open', 'page_view', 'quiz_start', 'quiz_complete')),
  session_id uuid NOT NULL,
  device_id uuid NOT NULL,
  category_id bigint REFERENCES public.question_categories(id) ON DELETE SET NULL,
  path text CHECK (char_length(path) <= 200),
  locale text CHECK (char_length(locale) <= 10),
  platform text CHECK (char_length(platform) <= 20),
  correct_count integer CHECK (correct_count BETWEEN 0 AND 500),
  total_count integer CHECK (total_count BETWEEN 0 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events (created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_type_created_at ON public.app_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_category_id ON public.app_events (category_id);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Clients may only write the tracked columns; id and created_at stay server-controlled.
REVOKE ALL ON public.app_events FROM anon, authenticated;
GRANT INSERT (event_type, session_id, device_id, category_id, path, locale, platform, correct_count, total_count)
  ON public.app_events TO anon, authenticated;
GRANT SELECT ON public.app_events TO authenticated;

DROP POLICY IF EXISTS "Anyone can log app events" ON public.app_events;
CREATE POLICY "Anyone can log app events"
  ON public.app_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type <> 'quiz_complete'
    OR (correct_count IS NOT NULL AND total_count IS NOT NULL AND correct_count <= total_count)
  );

DROP POLICY IF EXISTS "Admins read app events" ON public.app_events;
CREATE POLICY "Admins read app events"
  ON public.app_events
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.get_activity_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_from timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
    SELECT * FROM public.app_events WHERE created_at >= v_from
  ),
  totals AS (
    SELECT
      count(DISTINCT session_id) AS sessions,
      count(DISTINCT device_id) AS devices,
      count(*) FILTER (WHERE event_type = 'page_view') AS page_views,
      count(*) FILTER (WHERE event_type = 'quiz_start') AS quiz_starts,
      count(*) FILTER (WHERE event_type = 'quiz_complete') AS quiz_completes,
      round(
        avg(correct_count::numeric * 100 / NULLIF(total_count, 0)) FILTER (WHERE event_type = 'quiz_complete'),
        1
      ) AS avg_score_pct,
      count(DISTINCT device_id) FILTER (WHERE created_at >= date_trunc('day', now())) AS devices_today
    FROM ev
  ),
  days AS (
    SELECT d::date AS day
    FROM generate_series(v_from, date_trunc('day', now()), interval '1 day') AS d
  ),
  daily AS (
    SELECT
      days.day,
      count(DISTINCT ev.session_id) AS sessions,
      count(DISTINCT ev.device_id) AS devices,
      count(ev.id) FILTER (WHERE ev.event_type = 'quiz_start') AS quiz_starts,
      count(ev.id) FILTER (WHERE ev.event_type = 'quiz_complete') AS quiz_completes
    FROM days
    LEFT JOIN ev ON ev.created_at::date = days.day
    GROUP BY days.day
  ),
  by_category AS (
    SELECT
      ev.category_id,
      max(t.name) AS name,
      count(*) FILTER (WHERE ev.event_type = 'quiz_start') AS starts,
      count(*) FILTER (WHERE ev.event_type = 'quiz_complete') AS completes,
      round(
        avg(ev.correct_count::numeric * 100 / NULLIF(ev.total_count, 0)) FILTER (WHERE ev.event_type = 'quiz_complete'),
        1
      ) AS avg_score_pct
    FROM ev
    LEFT JOIN public.question_category_translations t
      ON t.question_category_id = ev.category_id AND t.locale = 'fr'
    WHERE ev.category_id IS NOT NULL
    GROUP BY ev.category_id
  ),
  by_platform AS (
    SELECT COALESCE(platform, 'unknown') AS platform, count(DISTINCT device_id) AS devices
    FROM ev
    GROUP BY 1
  ),
  by_locale AS (
    SELECT COALESCE(locale, 'unknown') AS locale, count(DISTINCT device_id) AS devices
    FROM ev
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'totals', (SELECT to_jsonb(totals) FROM totals),
    'daily', COALESCE((SELECT jsonb_agg(to_jsonb(daily) ORDER BY daily.day) FROM daily), '[]'::jsonb),
    'by_category', COALESCE((SELECT jsonb_agg(to_jsonb(by_category) ORDER BY by_category.starts DESC) FROM by_category), '[]'::jsonb),
    'by_platform', COALESCE((SELECT jsonb_agg(to_jsonb(by_platform) ORDER BY by_platform.devices DESC) FROM by_platform), '[]'::jsonb),
    'by_locale', COALESCE((SELECT jsonb_agg(to_jsonb(by_locale) ORDER BY by_locale.devices DESC) FROM by_locale), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_activity_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_activity_stats(integer) TO authenticated;
