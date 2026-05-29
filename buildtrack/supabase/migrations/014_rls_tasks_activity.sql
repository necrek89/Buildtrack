-- 014_rls_tasks_activity.sql
-- Add/fix RLS policies so that foreman A can NEVER see foreman B's data,
-- even if the frontend has a bug. Defense-in-depth.

-- ── tasks ─────────────────────────────────────────────────────────────────────
-- Drop any existing over-permissive policies first
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "select_tasks"  ON tasks;
DROP POLICY IF EXISTS "all_tasks"     ON tasks;

-- Foreman: owns the project → can see all tasks in it
-- Worker/manager: must be in project_workers for the project
-- (covers all roles in one policy)
CREATE POLICY "tasks_select_scoped" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND (
          p.foreman_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_workers pw
            WHERE pw.project_id = p.id AND pw.worker_id = auth.uid()
          )
        )
    )
  );

-- ── activity_log ──────────────────────────────────────────────────────────────
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON activity_log;

CREATE POLICY "activity_select_scoped" ON activity_log
  FOR SELECT USING (
    -- own actions (always visible to actor)
    actor_id = auth.uid()
    OR
    -- actions in projects where user is foreman or member
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = activity_log.project_id
        AND (
          p.foreman_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_workers pw
            WHERE pw.project_id = p.id AND pw.worker_id = auth.uid()
          )
        )
    ))
  );

-- Allow anyone (authenticated) to insert their own activity
DROP POLICY IF EXISTS "activity_insert" ON activity_log;
CREATE POLICY "activity_insert" ON activity_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());
