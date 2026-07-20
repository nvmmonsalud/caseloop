-- Enforce course-scoped k-anonymity at the database boundary.
-- Five is the minimum allowed threshold; administrators may raise it per course.

ALTER TABLE public.courses
  ADD COLUMN cohort_minimum_size SMALLINT NOT NULL DEFAULT 5,
  ADD CONSTRAINT courses_cohort_minimum_size_check
    CHECK (cohort_minimum_size BETWEEN 5 AND 50);

-- Faculty analytics must flow through the threshold-aware RPC. Direct faculty
-- reads of enrollment identities, attempt metadata, and stored insight counts
-- are intentionally removed.
DROP POLICY IF EXISTS enrollments_self_or_faculty_read ON public.enrollments;
CREATE POLICY enrollments_self_read ON public.enrollments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS attempts_faculty_read ON public.student_attempts;
DROP POLICY IF EXISTS insights_faculty_read ON public.faculty_insights;
REVOKE SELECT ON public.faculty_insights FROM authenticated;

DROP FUNCTION public.get_caseflow_cohort_summary();

CREATE FUNCTION public.get_caseflow_cohort_summary(
  target_assignment UUID DEFAULT '40000000-0000-0000-0000-000000000001'
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  current_user_id UUID := (SELECT auth.uid());
  target_course UUID;
  minimum_size SMALLINT;
  completed_count BIGINT;
  result JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT assignment.course_id, course.cohort_minimum_size
  INTO target_course, minimum_size
  FROM public.assignments AS assignment
  JOIN public.courses AS course ON course.id = assignment.course_id
  WHERE assignment.id = target_assignment;

  -- Use the same error for a missing assignment and a cross-course request so
  -- callers cannot enumerate assignments outside their faculty scope.
  IF target_course IS NULL OR NOT public.is_caseflow_course_faculty(target_course) THEN
    RAISE EXCEPTION 'Faculty access required' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)
  INTO completed_count
  FROM public.synthetic_cohort_responses
  WHERE assignment_id = target_assignment;

  IF completed_count < minimum_size THEN
    RETURN jsonb_build_object(
      'suppressed', true,
      'minimumCohortSize', minimum_size
    );
  END IF;

  SELECT jsonb_build_object(
    'suppressed', false,
    'minimumCohortSize', minimum_size,
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
        WHERE assignment_id = target_assignment
        ORDER BY anonymous_key
        LIMIT 6
      ) AS representative
    ), '[]'::jsonb)
  ) INTO result
  FROM public.synthetic_cohort_responses
  WHERE assignment_id = target_assignment;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_caseflow_cohort_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_caseflow_cohort_summary(UUID) TO authenticated;
