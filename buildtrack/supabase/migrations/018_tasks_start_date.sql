-- Optional start date for a task, alongside the existing `deadline` (now
-- read as the end date). Powers the crew Schedule view — a task with no
-- start_date is treated as a single-day marker on its deadline.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date date;
