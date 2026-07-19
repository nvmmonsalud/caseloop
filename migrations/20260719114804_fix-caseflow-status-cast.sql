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

  RETURN jsonb_build_object(
    'attemptId', current_attempt_id,
    'status', CASE WHEN completed THEN 'completed' ELSE 'in_progress' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_caseflow_attempt(JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_caseflow_attempt(JSONB, TEXT) TO authenticated;
