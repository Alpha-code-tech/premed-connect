-- ============================================================
-- Abuse Protection: IP-based rate limiting support
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Add ip_address column to rate_limits for IP-based tracking
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS ip_address text;

-- Index for efficient IP + action lookups (used by checkIpRateLimit)
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action
  ON rate_limits (ip_address, action)
  WHERE ip_address IS NOT NULL;

-- Index for user + action lookups (used by checkUserRateLimit)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON rate_limits (user_id, action)
  WHERE user_id IS NOT NULL;

-- Automatically expire and purge stale rate limit rows older than 2 hours
-- (keeps the table small; windows are max 60 minutes)
CREATE OR REPLACE FUNCTION purge_expired_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '2 hours';
$$;

-- RLS: rate_limits is only ever accessed via service role in edge functions,
-- so deny all direct client access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_no_direct_access" ON rate_limits;
CREATE POLICY "rate_limits_no_direct_access" ON rate_limits
  FOR ALL TO authenticated USING (false);

-- ============================================================
-- Access requests: restrict direct client INSERT
-- (submissions now go through the submit-access-request edge function)
-- ============================================================

-- Revoke the unauthenticated insert policy if it exists
DROP POLICY IF EXISTS "access_requests_insert_public" ON access_requests;
DROP POLICY IF EXISTS "allow_public_insert" ON access_requests;

-- Ensure RLS is enabled on access_requests
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Developers can read all access requests
DROP POLICY IF EXISTS "access_requests_read_developer" ON access_requests;
CREATE POLICY "access_requests_read_developer" ON access_requests
  FOR SELECT TO authenticated
  USING (auth_role() IN ('developer', 'governor'));

-- Developers can update (approve/reject) access requests
DROP POLICY IF EXISTS "access_requests_update_developer" ON access_requests;
CREATE POLICY "access_requests_update_developer" ON access_requests
  FOR UPDATE TO authenticated
  USING (auth_role() = 'developer');
