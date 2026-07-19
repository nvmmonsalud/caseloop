-- CaseFlow persistence v1 for InsForge.
-- Application data lives in public; auth.users remains the identity source.

CREATE TYPE public.caseflow_user_role AS ENUM ('student', 'faculty');
CREATE TYPE public.caseflow_entry_mode AS ENUM ('acquisition', 'joint_venture', 'organic_entry');
CREATE TYPE public.caseflow_attempt_status AS ENUM ('in_progress', 'completed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  role public.caseflow_user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.enrollments (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.caseflow_user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  is_fictional BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.case_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  content TEXT NOT NULL,
  storage_url TEXT,
  storage_key TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, source_key)
);

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ,
  diagnostic_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, case_id)
);

CREATE TABLE public.learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, sort_order)
);

CREATE TABLE public.student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.caseflow_attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id),
  CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR status = 'in_progress')
);

CREATE TABLE public.student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN (
    'initial_recommendation', 'supporting_evidence', 'biggest_uncertainty',
    'coach_response', 'coach_followup'
  )),
  content TEXT NOT NULL,
  source_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, response_type)
);

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.decision_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision public.caseflow_entry_mode NOT NULL,
  rationale TEXT NOT NULL,
  key_risk TEXT NOT NULL,
  mitigation TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 20 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.preparation_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES public.student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comparison JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.faculty_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content JSONB NOT NULL,
  source_response_count INTEGER NOT NULL CHECK (source_response_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, insight_type)
);

-- Synthetic cohort rows are intentionally disconnected from auth identities.
CREATE TABLE public.synthetic_cohort_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  anonymous_key TEXT NOT NULL,
  position public.caseflow_entry_mode NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 20 AND 100),
  evidence TEXT[] NOT NULL DEFAULT '{}',
  assumption TEXT NOT NULL,
  rationale TEXT NOT NULL,
  support TEXT NOT NULL CHECK (support IN ('strong', 'mixed', 'weak')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, anonymous_key)
);

CREATE INDEX enrollments_user_idx ON public.enrollments(user_id, course_id);
CREATE INDEX assignments_course_idx ON public.assignments(course_id);
CREATE INDEX assignments_case_idx ON public.assignments(case_id);
CREATE INDEX objectives_assignment_idx ON public.learning_objectives(assignment_id, sort_order);
CREATE INDEX attempts_student_idx ON public.student_attempts(student_id, assignment_id);
CREATE INDEX attempts_assignment_status_idx ON public.student_attempts(assignment_id, status);
CREATE INDEX responses_student_idx ON public.student_responses(student_id, attempt_id);
CREATE INDEX conversations_student_idx ON public.ai_conversations(student_id, attempt_id);
CREATE INDEX checkpoints_student_idx ON public.decision_checkpoints(student_id, attempt_id);
CREATE INDEX briefs_student_idx ON public.preparation_briefs(student_id, attempt_id);
CREATE INDEX reflections_student_idx ON public.reflections(student_id, attempt_id);
CREATE INDEX insights_assignment_idx ON public.faculty_insights(assignment_id);
CREATE INDEX synthetic_assignment_position_idx ON public.synthetic_cohort_responses(assignment_id, position);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER cases_updated_at BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER case_sources_updated_at BEFORE UPDATE ON public.case_sources
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER objectives_updated_at BEFORE UPDATE ON public.learning_objectives
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER attempts_updated_at BEFORE UPDATE ON public.student_attempts
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER responses_updated_at BEFORE UPDATE ON public.student_responses
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER checkpoints_updated_at BEFORE UPDATE ON public.decision_checkpoints
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER briefs_updated_at BEFORE UPDATE ON public.preparation_briefs
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER reflections_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER insights_updated_at BEFORE UPDATE ON public.faculty_insights
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_cohort_responses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_caseflow_course_member(target_course UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = target_course AND user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_caseflow_course_faculty(target_course UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE course_id = target_course
      AND user_id = (SELECT auth.uid())
      AND role = 'faculty'
  );
$$;

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY courses_member_read ON public.courses
  FOR SELECT TO authenticated USING (public.is_caseflow_course_member(id));
CREATE POLICY enrollments_self_or_faculty_read ON public.enrollments
  FOR SELECT TO authenticated USING (
    user_id = (SELECT auth.uid()) OR public.is_caseflow_course_faculty(course_id)
  );
CREATE POLICY cases_enrolled_read ON public.cases
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.case_id = cases.id
      AND public.is_caseflow_course_member(assignment.course_id)
  ));
CREATE POLICY sources_enrolled_read ON public.case_sources
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.case_id = case_sources.case_id
      AND public.is_caseflow_course_member(assignment.course_id)
  ));
CREATE POLICY assignments_member_read ON public.assignments
  FOR SELECT TO authenticated USING (public.is_caseflow_course_member(course_id));
CREATE POLICY objectives_member_read ON public.learning_objectives
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = learning_objectives.assignment_id
      AND public.is_caseflow_course_member(assignment.course_id)
  ));

CREATE POLICY attempts_owner_read ON public.student_attempts
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY attempts_faculty_read ON public.student_attempts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = student_attempts.assignment_id
      AND public.is_caseflow_course_faculty(assignment.course_id)
  ));
CREATE POLICY responses_owner_read ON public.student_responses
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY conversations_owner_read ON public.ai_conversations
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY checkpoints_owner_read ON public.decision_checkpoints
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY briefs_owner_read ON public.preparation_briefs
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY reflections_owner_read ON public.reflections
  FOR SELECT TO authenticated USING (student_id = (SELECT auth.uid()));
CREATE POLICY insights_faculty_read ON public.faculty_insights
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.assignments assignment
    WHERE assignment.id = faculty_insights.assignment_id
      AND public.is_caseflow_course_faculty(assignment.course_id)
  ));

-- Runtime roles may read only policy-authorized rows. Mutations go through guarded RPCs.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles, public.courses, public.enrollments, public.cases,
  public.case_sources, public.assignments, public.learning_objectives,
  public.student_attempts, public.student_responses, public.ai_conversations,
  public.decision_checkpoints, public.preparation_briefs, public.reflections,
  public.faculty_insights TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_caseflow_profile(display_name_input TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  safe_name TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  safe_name := left(COALESCE(NULLIF(btrim(display_name_input), ''), 'CaseFlow student'), 120);

  INSERT INTO public.profiles (id, display_name, role)
  VALUES (current_user_id, safe_name, 'student')
  ON CONFLICT (id) DO UPDATE SET
    display_name = CASE
      WHEN public.profiles.display_name = 'CaseFlow student' THEN EXCLUDED.display_name
      ELSE public.profiles.display_name
    END;

  INSERT INTO public.enrollments (course_id, user_id, role)
  VALUES ('30000000-0000-0000-0000-000000000001', current_user_id, 'student')
  ON CONFLICT (course_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('userId', current_user_id, 'role', (
    SELECT role FROM public.profiles WHERE id = current_user_id
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.save_caseflow_attempt(payload JSONB, stage TEXT DEFAULT 'draft')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  current_attempt_id UUID;
  completed BOOLEAN := stage = 'completed';
  decision_value public.caseflow_entry_mode;
  response_pair RECORD;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Attempt payload must be an object';
  END IF;
  IF stage NOT IN ('draft', 'completed') THEN
    RAISE EXCEPTION 'Unsupported attempt stage';
  END IF;

  PERFORM public.bootstrap_caseflow_profile(NULL);

  INSERT INTO public.student_attempts (assignment_id, student_id, status, completed_at)
  VALUES (
    '40000000-0000-0000-0000-000000000001',
    current_user_id,
    (CASE WHEN completed THEN 'completed' ELSE 'in_progress' END)::public.caseflow_attempt_status,
    CASE WHEN completed THEN now() ELSE NULL END
  )
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET
    status = EXCLUDED.status,
    completed_at = CASE
      WHEN EXCLUDED.status = 'completed' THEN COALESCE(public.student_attempts.completed_at, now())
      ELSE public.student_attempts.completed_at
    END
  RETURNING id INTO current_attempt_id;

  FOR response_pair IN SELECT * FROM (VALUES
    ('initial_recommendation', payload->>'recommendation'),
    ('supporting_evidence', payload->>'evidence'),
    ('biggest_uncertainty', payload->>'uncertainty'),
    ('coach_response', payload->>'coachResponse'),
    ('coach_followup', payload->>'followupResponse')
  ) AS response_values(response_type, content)
  LOOP
    IF COALESCE(btrim(response_pair.content), '') <> '' THEN
      INSERT INTO public.student_responses (
        attempt_id, student_id, response_type, content, source_ids
      ) VALUES (
        current_attempt_id,
        current_user_id,
        response_pair.response_type,
        response_pair.content,
        ARRAY(SELECT DISTINCT match[1] FROM regexp_matches(response_pair.content, E'\\[(S[1-5])\\]', 'g') AS match)
      )
      ON CONFLICT (attempt_id, response_type) DO UPDATE SET
        content = EXCLUDED.content,
        source_ids = EXCLUDED.source_ids;
    END IF;
  END LOOP;

  IF completed THEN
    IF COALESCE(payload->>'rationale', '') = ''
      OR COALESCE(payload->>'risk', '') = ''
      OR COALESCE(payload->>'mitigation', '') = '' THEN
      RAISE EXCEPTION 'A completed attempt requires rationale, risk, and mitigation';
    END IF;

    decision_value := CASE payload->>'position'
      WHEN 'Acquisition' THEN 'acquisition'::public.caseflow_entry_mode
      WHEN 'Joint venture' THEN 'joint_venture'::public.caseflow_entry_mode
      WHEN 'Organic entry' THEN 'organic_entry'::public.caseflow_entry_mode
      ELSE NULL
    END;
    IF decision_value IS NULL THEN
      RAISE EXCEPTION 'Unsupported decision position';
    END IF;

    INSERT INTO public.decision_checkpoints (
      attempt_id, student_id, decision, rationale, key_risk, mitigation, confidence
    ) VALUES (
      current_attempt_id,
      current_user_id,
      decision_value,
      payload->>'rationale',
      payload->>'risk',
      payload->>'mitigation',
      LEAST(100, GREATEST(20, COALESCE((payload->>'confidence')::INTEGER, 70)))
    )
    ON CONFLICT (attempt_id) DO UPDATE SET
      decision = EXCLUDED.decision,
      rationale = EXCLUDED.rationale,
      key_risk = EXCLUDED.key_risk,
      mitigation = EXCLUDED.mitigation,
      confidence = EXCLUDED.confidence;
  END IF;

  RETURN jsonb_build_object('attemptId', current_attempt_id, 'status', CASE WHEN completed THEN 'completed' ELSE 'in_progress' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.load_caseflow_attempt()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE WHEN attempt.id IS NULL THEN NULL ELSE jsonb_build_object(
    'attemptId', attempt.id,
    'status', attempt.status,
    'recommendation', COALESCE((SELECT content FROM public.student_responses WHERE attempt_id = attempt.id AND response_type = 'initial_recommendation'), ''),
    'evidence', COALESCE((SELECT content FROM public.student_responses WHERE attempt_id = attempt.id AND response_type = 'supporting_evidence'), ''),
    'uncertainty', COALESCE((SELECT content FROM public.student_responses WHERE attempt_id = attempt.id AND response_type = 'biggest_uncertainty'), ''),
    'coachResponse', COALESCE((SELECT content FROM public.student_responses WHERE attempt_id = attempt.id AND response_type = 'coach_response'), ''),
    'followupResponse', COALESCE((SELECT content FROM public.student_responses WHERE attempt_id = attempt.id AND response_type = 'coach_followup'), ''),
    'position', CASE checkpoint.decision
      WHEN 'acquisition' THEN 'Acquisition'
      WHEN 'joint_venture' THEN 'Joint venture'
      WHEN 'organic_entry' THEN 'Organic entry'
      ELSE 'Joint venture'
    END,
    'rationale', COALESCE(checkpoint.rationale, ''),
    'risk', COALESCE(checkpoint.key_risk, ''),
    'mitigation', COALESCE(checkpoint.mitigation, ''),
    'confidence', COALESCE(checkpoint.confidence, 70),
    'brief', brief.content,
    'reflection', reflection.content,
    'comparison', reflection.comparison
  ) END
  FROM (SELECT (SELECT auth.uid()) AS user_id) AS current_identity
  LEFT JOIN public.student_attempts attempt
    ON attempt.student_id = current_identity.user_id
   AND attempt.assignment_id = '40000000-0000-0000-0000-000000000001'
  LEFT JOIN public.decision_checkpoints checkpoint ON checkpoint.attempt_id = attempt.id
  LEFT JOIN public.preparation_briefs brief ON brief.attempt_id = attempt.id
  LEFT JOIN public.reflections reflection ON reflection.attempt_id = attempt.id;
$$;

CREATE OR REPLACE FUNCTION public.save_caseflow_brief(brief_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  current_attempt_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF brief_payload IS NULL OR jsonb_typeof(brief_payload) <> 'object' THEN
    RAISE EXCEPTION 'Brief payload must be an object';
  END IF;

  SELECT id INTO current_attempt_id FROM public.student_attempts
  WHERE assignment_id = '40000000-0000-0000-0000-000000000001'
    AND student_id = current_user_id;
  IF current_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Complete an attempt before saving a brief';
  END IF;

  INSERT INTO public.preparation_briefs (attempt_id, student_id, content, released_at)
  VALUES (current_attempt_id, current_user_id, brief_payload, now())
  ON CONFLICT (attempt_id) DO UPDATE SET content = EXCLUDED.content, released_at = EXCLUDED.released_at;

  RETURN jsonb_build_object('saved', true, 'attemptId', current_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_caseflow_reflection(reflection_text TEXT, comparison_payload JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  current_attempt_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF COALESCE(btrim(reflection_text), '') = '' THEN
    RAISE EXCEPTION 'Reflection cannot be empty';
  END IF;

  SELECT id INTO current_attempt_id FROM public.student_attempts
  WHERE assignment_id = '40000000-0000-0000-0000-000000000001'
    AND student_id = current_user_id;
  IF current_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Complete an attempt before saving a reflection';
  END IF;

  INSERT INTO public.reflections (attempt_id, student_id, content, comparison)
  VALUES (current_attempt_id, current_user_id, reflection_text, comparison_payload)
  ON CONFLICT (attempt_id) DO UPDATE SET content = EXCLUDED.content, comparison = EXCLUDED.comparison;

  RETURN jsonb_build_object('saved', true, 'attemptId', current_attempt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_caseflow_cohort_summary()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  assignment_uuid CONSTANT UUID := '40000000-0000-0000-0000-000000000001';
  course_uuid CONSTANT UUID := '30000000-0000-0000-0000-000000000001';
  result JSONB;
BEGIN
  IF NOT public.is_caseflow_course_faculty(course_uuid) THEN
    RAISE EXCEPTION 'Faculty access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'completed', count(*),
    'averageConfidence', round(avg(confidence), 1),
    'positions', jsonb_build_object(
      'Acquisition', count(*) FILTER (WHERE position = 'acquisition'),
      'Joint venture', count(*) FILTER (WHERE position = 'joint_venture'),
      'Organic entry', count(*) FILTER (WHERE position = 'organic_entry')
    ),
    'representativeArguments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'anonymousKey', anonymous_key,
        'position', position,
        'rationale', rationale,
        'evidence', evidence
      ))
      FROM (
        SELECT anonymous_key, position, rationale, evidence
        FROM public.synthetic_cohort_responses
        WHERE assignment_id = assignment_uuid
        ORDER BY anonymous_key
        LIMIT 6
      ) AS representative
    ), '[]'::jsonb)
  ) INTO result
  FROM public.synthetic_cohort_responses
  WHERE assignment_id = assignment_uuid;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.is_caseflow_course_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_caseflow_course_faculty(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_caseflow_profile(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_caseflow_attempt(JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.load_caseflow_attempt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_caseflow_brief(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_caseflow_reflection(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_caseflow_cohort_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_caseflow_course_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_caseflow_course_faculty(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_caseflow_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_caseflow_attempt(JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.load_caseflow_attempt() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_caseflow_brief(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_caseflow_reflection(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_caseflow_cohort_summary() TO authenticated;

INSERT INTO public.courses (id, title, code) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Global Strategy', 'MBA 642');

INSERT INTO public.cases (id, slug, title, summary, is_fictional) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'hikari-philippines',
  'Hikari Foods: Choosing a Market Entry Strategy for the Philippines',
  'A fictional mid-sized Japanese consumer food company evaluates acquisition, joint venture, or organic entry in the Philippines.',
  true
);

INSERT INTO public.case_sources (case_id, source_key, title, source_type, content) VALUES
  ('10000000-0000-0000-0000-000000000001', 'S1', 'Market outlook', 'Case exhibit', 'The fictional premium packaged-food segment is projected to grow 8.4% annually through 2030. Modern trade drives 46% of urban sales; fragmented sari-sari stores remain essential outside central Manila.'),
  ('10000000-0000-0000-0000-000000000001', 'S2', 'Strategic options', 'Case exhibit', 'Pacifica Foods asks ¥4.8B for acquisition. A joint venture requires ¥1.7B initial capital. Organic entry is budgeted at ¥900M but management estimates four to six years to meaningful distribution.'),
  ('10000000-0000-0000-0000-000000000001', 'S3', 'Consumer research', 'Field note', 'Consumers value familiar flavors, small pack sizes, and affordability. Hikari scores well on quality but low on unaided awareness. Localized calamansi and adobo concepts test strongly.'),
  ('10000000-0000-0000-0000-000000000001', 'S4', 'Operating risks', 'Board memo', 'Foreign ownership review, product registration, cold-chain gaps, and distributor concentration could delay scale. Hikari has no Philippine regulatory team and limited post-merger integration capacity.'),
  ('10000000-0000-0000-0000-000000000001', 'S5', 'Partner profile', 'Diligence note', 'Manila Harvest offers regulatory expertise and access to 18,000 outlets. Its founder-led culture is fast but informal; reporting controls fall below Hikari standards.');

INSERT INTO public.assignments (
  id, course_id, case_id, due_at, diagnostic_questions, decision_options, rubric
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '2026-07-21 08:30:00+09',
  '["Initial recommendation", "Strongest supporting evidence", "Biggest uncertainty"]'::jsonb,
  '["Acquisition", "Joint venture", "Organic entry"]'::jsonb,
  '{"criteria":["evidence use","assumption quality","trade-off reasoning"],"grading":"formative-only"}'::jsonb
);

INSERT INTO public.learning_objectives (assignment_id, objective, sort_order) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Evaluate entry modes under uncertainty', 1),
  ('40000000-0000-0000-0000-000000000001', 'Balance speed, control, and capital exposure', 2),
  ('40000000-0000-0000-0000-000000000001', 'Anticipate execution risk across stakeholders', 3);

INSERT INTO public.synthetic_cohort_responses (
  assignment_id, anonymous_key, position, confidence, evidence, assumption, rationale, support
) VALUES
  ('40000000-0000-0000-0000-000000000001','A01','joint_venture',78,ARRAY['S2','S5'],'Partner access will transfer to Hikari products.','Balances distribution speed with manageable capital exposure.','strong'),
  ('40000000-0000-0000-0000-000000000001','A02','acquisition',82,ARRAY['S1','S2'],'Category growth will offset the premium price.','Control and immediate scale justify the cost.','mixed'),
  ('40000000-0000-0000-0000-000000000001','A03','joint_venture',70,ARRAY['S3','S5'],'The partners can align quality controls.','Local knowledge is crucial for localization.','strong'),
  ('40000000-0000-0000-0000-000000000001','A04','organic_entry',61,ARRAY['S3','S4'],'Brand building can precede broad distribution.','Protects Hikari culture and limits capital at risk.','mixed'),
  ('40000000-0000-0000-0000-000000000001','A05','acquisition',91,ARRAY['S1'],'Speed is the dominant success factor.','Hikari must capture growth now.','weak'),
  ('40000000-0000-0000-0000-000000000001','A06','joint_venture',74,ARRAY['S2','S4','S5'],'Governance rights can mitigate informal controls.','A staged commitment preserves options.','strong'),
  ('40000000-0000-0000-0000-000000000001','A07','organic_entry',55,ARRAY['S2','S3'],'Online channels can bridge physical distribution.','Small tests reduce localization risk.','mixed'),
  ('40000000-0000-0000-0000-000000000001','A08','joint_venture',86,ARRAY['S5'],'18,000 outlets means immediate national reach.','The partner solves distribution.','weak'),
  ('40000000-0000-0000-0000-000000000001','A09','acquisition',68,ARRAY['S2','S4'],'Integration can be outsourced.','Control enables consistent quality.','mixed'),
  ('40000000-0000-0000-0000-000000000001','A10','joint_venture',76,ARRAY['S1','S3','S5'],'Localized products can retain premium positioning.','It combines adaptation with fast market access.','strong'),
  ('40000000-0000-0000-0000-000000000001','A11','organic_entry',64,ARRAY['S3'],'Consumers will pay a Japanese quality premium.','Own-market learning creates durable advantage.','weak'),
  ('40000000-0000-0000-0000-000000000001','A12','joint_venture',80,ARRAY['S2','S5'],'A buyout option can be negotiated.','Learn first, deepen ownership later.','strong');
