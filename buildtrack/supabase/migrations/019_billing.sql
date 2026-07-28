-- Paddle billing: 30-day free trial per foreman, then Standard/Pro subscription.
-- trial_ends_at is intentionally NOT backfilled here (a static now()+30d would
-- be wrong for every future signup) — the app lazily sets it to now()+30 days
-- the first time a foreman profile with a NULL trial_ends_at is loaded, the
-- same pattern already used for backfilling a missing invite_code.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_period text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;
