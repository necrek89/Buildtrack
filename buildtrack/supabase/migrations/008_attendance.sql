CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foreman_id uuid REFERENCES profiles(id),
  worker_id uuid REFERENCES profiles(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present',
  arrived_at time,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_foreman ON attendance(foreman_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "foreman_manage_attendance" ON attendance
  FOR ALL USING (foreman_id = auth.uid());
CREATE POLICY "worker_view_own" ON attendance
  FOR SELECT USING (worker_id = auth.uid());
