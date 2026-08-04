-- Paddle sets a scheduled_change on the subscription when a customer cancels
-- from the portal but keeps access until the current period ends — the
-- subscription_status stays 'active' until that date actually arrives, so
-- without this the account page had no way to show "cancels on {date}".
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_cancel_at timestamptz;
