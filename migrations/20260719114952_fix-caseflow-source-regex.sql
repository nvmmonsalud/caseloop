DO $migration$
DECLARE
  function_definition TEXT;
BEGIN
  SELECT pg_get_functiondef('public.save_caseflow_attempt(jsonb,text)'::regprocedure)
  INTO function_definition;

  function_definition := replace(
    function_definition,
    $$'\\[(S[1-5])\\]'$$,
    $$E'\\[(S[1-5])\\]'$$
  );

  EXECUTE function_definition;
END;
$migration$;
