-- 012_grants.sql
-- Explicit API grants required by Supabase new permission policy (effective Oct 2026).
-- RLS policies on each table remain the actual security layer — these grants just
-- allow the PostgREST API (anon / authenticated roles) to see the tables.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT ALL ON TABLE profiles          TO authenticated;
GRANT ALL ON TABLE projects          TO authenticated;
GRANT ALL ON TABLE tasks             TO authenticated;
GRANT ALL ON TABLE tools             TO authenticated;
GRANT ALL ON TABLE project_workers   TO authenticated;
GRANT ALL ON TABLE join_requests     TO authenticated;
GRANT ALL ON TABLE notifications     TO authenticated;
GRANT ALL ON TABLE documents         TO authenticated;
GRANT ALL ON TABLE expenses          TO authenticated;
GRANT ALL ON TABLE material_requests TO authenticated;
GRANT ALL ON TABLE work_logs         TO authenticated;
GRANT ALL ON TABLE attendance        TO authenticated;
GRANT ALL ON TABLE worker_payments   TO authenticated;
GRANT ALL ON TABLE materials         TO authenticated;

-- Sequences (needed for INSERT on tables with serial/identity PKs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
