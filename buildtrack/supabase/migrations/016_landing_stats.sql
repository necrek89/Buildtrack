-- 016_landing_stats.sql
-- Public aggregate stats for the landing page ticker.
-- SECURITY DEFINER lets the anon role read counts without any table grants;
-- the function returns only aggregate numbers, never row data.

CREATE OR REPLACE FUNCTION landing_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'tasks',    (SELECT count(*) FROM tasks),
    'workers',  (SELECT count(*) FROM profiles WHERE role = 'worker'),
    'projects', (SELECT count(*) FROM projects)
  );
$$;

REVOKE ALL ON FUNCTION landing_stats() FROM public;
GRANT EXECUTE ON FUNCTION landing_stats() TO anon, authenticated;
