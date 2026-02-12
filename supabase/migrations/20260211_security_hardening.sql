-- Security hardening: RLS coverage, webhook idempotency, account/compliance request tables.

-- Ensure profiles can be created by their owner (required for client-side upsert insert path)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Subscriptions: prevent duplicate Stripe transactions
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_store_transaction_id
ON subscriptions(store_transaction_id);

-- Webhook idempotency table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages webhook events" ON stripe_webhook_events;
CREATE POLICY "Service role manages webhook events"
ON stripe_webhook_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Compliance request tables
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_status
ON account_deletion_requests(user_id, status, requested_at DESC);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own deletion requests" ON account_deletion_requests;
CREATE POLICY "Users can view own deletion requests"
ON account_deletion_requests FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own deletion requests" ON account_deletion_requests;
CREATE POLICY "Users can create own deletion requests"
ON account_deletion_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED')),
  completed_at TIMESTAMPTZ,
  download_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_status
ON data_export_requests(user_id, status, requested_at DESC);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own data export requests" ON data_export_requests;
CREATE POLICY "Users can view own data export requests"
ON data_export_requests FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own data export requests" ON data_export_requests;
CREATE POLICY "Users can create own data export requests"
ON data_export_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Core table RLS coverage
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own swipe graph" ON swipes;
CREATE POLICY "Users can view own swipe graph"
ON swipes FOR SELECT
USING (swiper_id = auth.uid() OR swiped_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own swipes" ON swipes;
CREATE POLICY "Users can create own swipes"
ON swipes FOR INSERT
WITH CHECK (swiper_id = auth.uid());

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches"
ON matches FOR SELECT
USING (profile_1_id = auth.uid() OR profile_2_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own matches" ON matches;
CREATE POLICY "Users can create own matches"
ON matches FOR INSERT
WITH CHECK (profile_1_id = auth.uid() OR profile_2_id = auth.uid());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
USING (profile_id = auth.uid());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
ON blocks FOR SELECT
USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own blocks" ON blocks;
CREATE POLICY "Users can create own blocks"
ON blocks FOR INSERT
WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;
CREATE POLICY "Users can delete own blocks"
ON blocks FOR DELETE
USING (blocker_id = auth.uid());

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own reports" ON reports;
CREATE POLICY "Users can create own reports"
ON reports FOR INSERT
WITH CHECK (reporter_id = auth.uid());

ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile photos" ON profile_photos;
CREATE POLICY "Users manage own profile photos"
ON profile_photos FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile interests" ON profile_interests;
CREATE POLICY "Users manage own profile interests"
ON profile_interests FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

ALTER TABLE profile_personality_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own personality tags" ON profile_personality_tags;
CREATE POLICY "Users manage own personality tags"
ON profile_personality_tags FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

ALTER TABLE profile_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile questions" ON profile_questions;
CREATE POLICY "Users manage own profile questions"
ON profile_questions FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

ALTER TABLE verified_work_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own verified work emails" ON verified_work_emails;
CREATE POLICY "Users can view own verified work emails"
ON verified_work_emails FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own verified work emails" ON verified_work_emails;
CREATE POLICY "Users can create own verified work emails"
ON verified_work_emails FOR INSERT
WITH CHECK (user_id = auth.uid());

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
CREATE POLICY "Users can view own verification requests"
ON verification_requests FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own verification requests" ON verification_requests;
CREATE POLICY "Users can create own verification requests"
ON verification_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own referral codes" ON referral_codes;
CREATE POLICY "Users can view own referral codes"
ON referral_codes FOR SELECT
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own referral codes" ON referral_codes;
CREATE POLICY "Users can create own referral codes"
ON referral_codes FOR INSERT
WITH CHECK (owner_id = auth.uid());

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals"
ON referrals FOR SELECT
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own referrals" ON referrals;
CREATE POLICY "Users can create own referrals"
ON referrals FOR INSERT
WITH CHECK (referrer_id = auth.uid());

ALTER TABLE verified_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read verified domains" ON verified_domains;
CREATE POLICY "Public can read verified domains"
ON verified_domains FOR SELECT
USING (true);
