-- The question form needs the type code (e.g. true_false) to adapt its fields,
-- and get_question_types() only returned the translated names.

CREATE OR REPLACE FUNCTION public.get_question_types()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  question_type_record record;
  translation_records jsonb;
BEGIN
  FOR question_type_record IN
    SELECT id, code, is_active FROM public.question_types ORDER BY id
  LOOP
    translation_records := (
      SELECT jsonb_agg(jsonb_build_object('locale', locale, 'name', name))
      FROM public.question_type_translations
      WHERE question_type_id = question_type_record.id
    );

    result := result || jsonb_build_object(
      'id', question_type_record.id,
      'code', question_type_record.code,
      'is_active', question_type_record.is_active,
      'translate', translation_records
    );
  END LOOP;

  RETURN result;
END;
$$;
