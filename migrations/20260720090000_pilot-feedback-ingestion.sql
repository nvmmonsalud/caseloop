-- Pilot readiness: faculty-controlled rubric/shared feedback and quarantined case ingestion.

ALTER TABLE public.assignments
  ADD COLUMN rubric_released_at TIMESTAMPTZ;

CREATE TABLE public.assignment_feedback (
  assignment_id UUID PRIMARY KEY REFERENCES public.assignments(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER assignment_feedback_updated_at
  BEFORE UPDATE ON public.assignment_feedback
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.assignment_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignment_feedback_faculty_read ON public.assignment_feedback
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = assignment_feedback.assignment_id
      AND public.is_caseflow_course_faculty(assignment.course_id)
  ));

CREATE POLICY assignment_feedback_released_member_read ON public.assignment_feedback
  FOR SELECT TO authenticated USING (
    released_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assignments assignment
      WHERE assignment.id = assignment_feedback.assignment_id
        AND public.is_caseflow_course_member(assignment.course_id)
    )
  );

GRANT SELECT ON public.assignment_feedback TO authenticated;

ALTER TABLE public.case_sources
  ADD COLUMN original_filename TEXT,
  ADD COLUMN size_bytes INTEGER,
  ADD COLUMN sha256 TEXT,
  ADD COLUMN uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'passed'
    CHECK (validation_status IN ('passed', 'quarantined', 'rejected')),
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD CONSTRAINT case_sources_file_metadata_complete CHECK (
    (storage_url IS NULL AND storage_key IS NULL AND original_filename IS NULL AND size_bytes IS NULL AND sha256 IS NULL)
    OR
    (storage_url IS NOT NULL AND storage_key IS NOT NULL AND original_filename IS NOT NULL
      AND size_bytes BETWEEN 1 AND 4194304 AND sha256 ~ '^[a-f0-9]{64}$')
  );

DROP POLICY sources_enrolled_read ON public.case_sources;
CREATE POLICY sources_enrolled_read ON public.case_sources
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.case_id = case_sources.case_id
      AND (
        public.is_caseflow_course_faculty(assignment.course_id)
        OR (case_sources.review_status = 'approved' AND public.is_caseflow_course_member(assignment.course_id))
      )
  ));

CREATE OR REPLACE FUNCTION public.get_caseflow_assignment_pilot_settings()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  assignment_uuid CONSTANT UUID := '40000000-0000-0000-0000-000000000001';
  course_uuid CONSTANT UUID := '30000000-0000-0000-0000-000000000001';
  is_faculty BOOLEAN;
  result JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_caseflow_course_member(course_uuid) THEN
    RAISE EXCEPTION 'Course membership required' USING ERRCODE = '42501';
  END IF;
  is_faculty := public.is_caseflow_course_faculty(course_uuid);

  SELECT jsonb_build_object(
    'rubric', CASE WHEN is_faculty OR assignment.rubric_released_at IS NOT NULL THEN assignment.rubric ELSE '[]'::jsonb END,
    'rubricReleasedAt', assignment.rubric_released_at,
    'feedback', CASE
      WHEN feedback.assignment_id IS NULL OR (NOT is_faculty AND feedback.released_at IS NULL) THEN NULL
      ELSE jsonb_build_object('title', feedback.title, 'body', feedback.body, 'releasedAt', feedback.released_at)
    END
  ) INTO result
  FROM public.assignments assignment
  LEFT JOIN public.assignment_feedback feedback ON feedback.assignment_id = assignment.id
  WHERE assignment.id = assignment_uuid;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_caseflow_assignment_pilot_settings(
  rubric_payload JSONB,
  feedback_title TEXT,
  feedback_body TEXT,
  release_to_students BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  assignment_uuid CONSTANT UUID := '40000000-0000-0000-0000-000000000001';
  course_uuid CONSTANT UUID := '30000000-0000-0000-0000-000000000001';
  current_user_id UUID := (SELECT auth.uid());
  total_weight INTEGER;
BEGIN
  IF current_user_id IS NULL OR NOT public.is_caseflow_course_faculty(course_uuid) THEN
    RAISE EXCEPTION 'Faculty access required' USING ERRCODE = '42501';
  END IF;
  IF rubric_payload IS NULL OR jsonb_typeof(rubric_payload) <> 'array' OR jsonb_array_length(rubric_payload) > 8 THEN
    RAISE EXCEPTION 'Rubric must be an array with at most eight criteria';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(rubric_payload) criterion
    WHERE jsonb_typeof(criterion) <> 'object'
      OR COALESCE(char_length(btrim(criterion->>'title')), 0) NOT BETWEEN 2 AND 80
      OR COALESCE(char_length(btrim(criterion->>'description')), 0) NOT BETWEEN 1 AND 500
      OR NOT COALESCE(criterion->>'weight', '') ~ '^\d{1,3}$'
      OR (criterion->>'weight')::INTEGER NOT BETWEEN 5 AND 100
  ) THEN
    RAISE EXCEPTION 'Every rubric criterion is invalid';
  END IF;
  SELECT COALESCE(sum((criterion->>'weight')::INTEGER), 0)
  INTO total_weight FROM jsonb_array_elements(rubric_payload) criterion;
  IF jsonb_array_length(rubric_payload) > 0 AND total_weight <> 100 THEN
    RAISE EXCEPTION 'Rubric weights must total 100';
  END IF;
  IF COALESCE(char_length(btrim(feedback_title)), 0) NOT BETWEEN 2 AND 120
    OR COALESCE(char_length(btrim(feedback_body)), 0) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'Shared feedback title and body are required';
  END IF;

  UPDATE public.assignments SET
    rubric = rubric_payload,
    rubric_released_at = CASE WHEN release_to_students THEN COALESCE(rubric_released_at, now()) ELSE NULL END
  WHERE id = assignment_uuid;

  INSERT INTO public.assignment_feedback (assignment_id, faculty_id, title, body, released_at)
  VALUES (assignment_uuid, current_user_id, btrim(feedback_title), btrim(feedback_body), CASE WHEN release_to_students THEN now() ELSE NULL END)
  ON CONFLICT (assignment_id) DO UPDATE SET
    faculty_id = EXCLUDED.faculty_id,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    released_at = CASE WHEN release_to_students THEN COALESCE(public.assignment_feedback.released_at, now()) ELSE NULL END;

  RETURN public.get_caseflow_assignment_pilot_settings();
END;
$$;

CREATE OR REPLACE FUNCTION public.register_caseflow_source(
  source_title TEXT,
  source_content TEXT,
  source_mime_type TEXT,
  source_storage_url TEXT,
  source_storage_key TEXT,
  source_original_filename TEXT,
  source_size_bytes INTEGER,
  source_sha256 TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  case_uuid CONSTANT UUID := '20000000-0000-0000-0000-000000000001';
  course_uuid CONSTANT UUID := '30000000-0000-0000-0000-000000000001';
  current_user_id UUID := (SELECT auth.uid());
  next_source_key TEXT;
  source_id UUID;
BEGIN
  IF current_user_id IS NULL OR NOT public.is_caseflow_course_faculty(course_uuid) THEN
    RAISE EXCEPTION 'Faculty access required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(char_length(btrim(source_title)), 0) NOT BETWEEN 2 AND 160
    OR COALESCE(char_length(btrim(source_content)), 0) NOT BETWEEN 40 AND 250000
    OR source_mime_type NOT IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    OR source_size_bytes NOT BETWEEN 1 AND 4194304
    OR source_sha256 !~ '^[a-f0-9]{64}$'
    OR COALESCE(source_storage_url, '') = '' OR COALESCE(source_storage_key, '') = '' THEN
    RAISE EXCEPTION 'Source metadata failed validation';
  END IF;

  SELECT 'S' || (COALESCE(max(substring(source_key FROM 2)::INTEGER), 0) + 1)::TEXT
  INTO next_source_key
  FROM public.case_sources WHERE case_id = case_uuid AND source_key ~ '^S\d{1,2}$';
  IF substring(next_source_key FROM 2)::INTEGER > 99 THEN RAISE EXCEPTION 'Source limit reached'; END IF;

  INSERT INTO public.case_sources (
    case_id, source_key, title, source_type, content, storage_url, storage_key, mime_type,
    original_filename, size_bytes, sha256, uploaded_by, validation_status, review_status
  ) VALUES (
    case_uuid, next_source_key, btrim(source_title), 'faculty_upload', btrim(source_content),
    source_storage_url, source_storage_key, source_mime_type, source_original_filename,
    source_size_bytes, source_sha256, current_user_id, 'passed', 'pending'
  ) RETURNING id INTO source_id;

  RETURN jsonb_build_object('id', source_id, 'sourceKey', next_source_key, 'reviewStatus', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_caseflow_source(source_id_input UUID, approve BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  course_uuid CONSTANT UUID := '30000000-0000-0000-0000-000000000001';
  current_user_id UUID := (SELECT auth.uid());
  affected INTEGER;
BEGIN
  IF current_user_id IS NULL OR NOT public.is_caseflow_course_faculty(course_uuid) THEN
    RAISE EXCEPTION 'Faculty access required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.case_sources SET
    review_status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = current_user_id,
    reviewed_at = now()
  WHERE id = source_id_input AND source_type = 'faculty_upload';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Source not found'; END IF;
  RETURN jsonb_build_object('reviewed', true, 'status', CASE WHEN approve THEN 'approved' ELSE 'rejected' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.caseflow_storage_course_id(object_key TEXT)
RETURNS UUID
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN split_part(object_key, '/', 1)::UUID;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE POLICY caseflow_materials_faculty_select ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket = 'case-materials'
    AND public.is_caseflow_course_faculty(public.caseflow_storage_course_id(key))
  );
CREATE POLICY caseflow_materials_faculty_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket = 'case-materials'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND public.is_caseflow_course_faculty(public.caseflow_storage_course_id(key))
  );
CREATE POLICY caseflow_materials_faculty_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket = 'case-materials'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND public.is_caseflow_course_faculty(public.caseflow_storage_course_id(key))
  );

GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

REVOKE ALL ON FUNCTION public.get_caseflow_assignment_pilot_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_caseflow_assignment_pilot_settings(JSONB, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_caseflow_source(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_caseflow_source(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caseflow_storage_course_id(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_caseflow_assignment_pilot_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_caseflow_assignment_pilot_settings(JSONB, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_caseflow_source(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_caseflow_source(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caseflow_storage_course_id(TEXT) TO authenticated;
