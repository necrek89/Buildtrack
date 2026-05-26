CREATE TABLE IF NOT EXISTS materials (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  foreman_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  task_id      uuid REFERENCES tasks(id) ON DELETE SET NULL,
  name         text NOT NULL,
  qty          numeric NOT NULL DEFAULT 1,
  unit         text NOT NULL DEFAULT 'pcs',
  note         text,
  reported_by  text,
  status       text NOT NULL DEFAULT 'needed',
  created_at   timestamptz DEFAULT now(),
  purchased_at timestamptz
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own materials" ON materials
  FOR ALL USING (foreman_id = auth.uid());
