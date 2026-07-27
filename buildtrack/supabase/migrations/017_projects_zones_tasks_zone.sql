-- Second, independent grouping axis alongside the existing stage/stages
-- pair: zone/zones (room or physical location — Kitchen, Bathroom, Balcony).
-- Purely additive, mirrors the existing columns exactly. No data migration —
-- existing tasks/projects simply have zone/zones unset until assigned.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zones text[];
ALTER TABLE tasks    ADD COLUMN IF NOT EXISTS zone  text;
