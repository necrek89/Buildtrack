-- Track the reporting worker by id, not just their display name, so
-- delete permission checks can't be spoofed or collide between workers
-- sharing the same name.
ALTER TABLE materials ADD COLUMN IF NOT EXISTS reported_by_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
