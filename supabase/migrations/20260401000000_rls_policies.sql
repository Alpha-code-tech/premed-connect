-- ============================================================
-- Row Level Security Policies — PreMed Connect
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: get the calling user's role from profiles
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_department()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- DEPARTMENTS — readable by all authenticated users
-- ============================================================
DROP POLICY IF EXISTS "departments_read" ON departments;
CREATE POLICY "departments_read" ON departments
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- PROFILES
-- ============================================================
-- Users can always read their own profile
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Special roles can read profiles in their department
DROP POLICY IF EXISTS "profiles_read_dept" ON profiles;
CREATE POLICY "profiles_read_dept" ON profiles
  FOR SELECT TO authenticated
  USING (
    auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer')
    AND (
      auth_role() IN ('governor', 'financial_secretary', 'developer')
      OR department_id = auth_department()
    )
  );

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only developers (via service role in edge function) can insert profiles
-- Service role bypasses RLS so this only matters for direct client inserts
DROP POLICY IF EXISTS "profiles_insert_developer" ON profiles;
CREATE POLICY "profiles_insert_developer" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth_role() = 'developer');

-- ============================================================
-- PAYMENTS — students own their records
-- ============================================================
DROP POLICY IF EXISTS "payments_read_own" ON payments;
CREATE POLICY "payments_read_own" ON payments
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer')
  );

-- Students can insert their own payments (Edge Function uses service role anyway)
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can update their own payments
DROP POLICY IF EXISTS "payments_update_own" ON payments;
CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ============================================================
-- PAYMENT ITEMS — readable by all authenticated users
-- ============================================================
DROP POLICY IF EXISTS "payment_items_read" ON payment_items;
CREATE POLICY "payment_items_read" ON payment_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_items_manage" ON payment_items;
CREATE POLICY "payment_items_manage" ON payment_items
  FOR ALL TO authenticated
  USING (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer'))
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer'));

-- ============================================================
-- NOTIFICATIONS — users only see their own
-- ============================================================
DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- Special roles can insert notifications for others
DROP POLICY IF EXISTS "notifications_insert_roles" ON notifications;
CREATE POLICY "notifications_insert_roles" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer')
    OR student_id = auth.uid()
  );

-- ============================================================
-- ANNOUNCEMENTS — all authenticated can read; special roles manage
-- ============================================================
DROP POLICY IF EXISTS "announcements_read" ON announcements;
CREATE POLICY "announcements_read" ON announcements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "announcements_manage" ON announcements;
CREATE POLICY "announcements_manage" ON announcements
  FOR ALL TO authenticated
  USING (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer'))
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer'));

-- ============================================================
-- RESOURCES — all authenticated can read; course reps manage
-- ============================================================
DROP POLICY IF EXISTS "resources_read" ON resources;
CREATE POLICY "resources_read" ON resources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "resources_manage" ON resources;
CREATE POLICY "resources_manage" ON resources
  FOR ALL TO authenticated
  USING (
    auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer')
    AND (uploaded_by = auth.uid() OR auth_role() IN ('governor', 'developer'))
  )
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'));

-- ============================================================
-- ISSUES — students own their issues; reps can update
-- ============================================================
DROP POLICY IF EXISTS "issues_read" ON issues;
CREATE POLICY "issues_read" ON issues
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer')
  );

DROP POLICY IF EXISTS "issues_insert_student" ON issues;
CREATE POLICY "issues_insert_student" ON issues
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "issues_update" ON issues;
CREATE POLICY "issues_update" ON issues
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer')
  );

DROP POLICY IF EXISTS "issues_delete_own" ON issues;
CREATE POLICY "issues_delete_own" ON issues
  FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('course_rep', 'governor', 'developer')
  );

-- ============================================================
-- MOCK TESTS — all authenticated can read published tests
-- ============================================================
DROP POLICY IF EXISTS "mock_tests_read" ON mock_tests;
CREATE POLICY "mock_tests_read" ON mock_tests
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer')
  );

DROP POLICY IF EXISTS "mock_tests_manage" ON mock_tests;
CREATE POLICY "mock_tests_manage" ON mock_tests
  FOR ALL TO authenticated
  USING (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'))
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'));

-- ============================================================
-- MOCK QUESTIONS — correct_answer exposed only at submission
-- (RLS cannot hide columns; use a DB view or Edge Function for scoring)
-- All authenticated users can read questions for published tests
-- ============================================================
DROP POLICY IF EXISTS "mock_questions_read" ON mock_questions;
CREATE POLICY "mock_questions_read" ON mock_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mock_questions_manage" ON mock_questions;
CREATE POLICY "mock_questions_manage" ON mock_questions
  FOR ALL TO authenticated
  USING (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'))
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'));

-- ============================================================
-- MOCK ATTEMPTS — students own their attempts
-- ============================================================
DROP POLICY IF EXISTS "mock_attempts_read_own" ON mock_attempts;
CREATE POLICY "mock_attempts_read_own" ON mock_attempts
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer')
  );

DROP POLICY IF EXISTS "mock_attempts_insert_own" ON mock_attempts;
CREATE POLICY "mock_attempts_insert_own" ON mock_attempts
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "mock_attempts_update_own" ON mock_attempts;
CREATE POLICY "mock_attempts_update_own" ON mock_attempts
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
