-- ============================================================
-- Create audit_log table and secure it with RLS
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type          text NOT NULL,
  performed_by         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  affected_entity_type text NOT NULL,
  affected_entity_id   text,
  metadata             jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_read_developer" ON audit_log;
CREATE POLICY "audit_log_read_developer" ON audit_log
  FOR SELECT TO authenticated
  USING (auth_role() = 'developer');

DROP POLICY IF EXISTS "audit_log_insert_self" ON audit_log;
CREATE POLICY "audit_log_insert_self" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- No UPDATE or DELETE — audit logs are immutable
