-- 013_material_requests_updated_at.sql
-- Add updated_at to material_requests so the "Куплено" tab can show the real
-- purchase date (when status changed to 'closed') instead of created_at.

ALTER TABLE material_requests
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update the column on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_material_requests_updated_at ON material_requests;
CREATE TRIGGER trg_material_requests_updated_at
  BEFORE UPDATE ON material_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
