-- ============================================================
-- IDOR Hardening — Ownership-enforced RLS policies
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- TIMETABLE ENTRIES — no RLS existed; students own their rows
-- ============================================================
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_entries_read_own" ON timetable_entries;
CREATE POLICY "timetable_entries_read_own" ON timetable_entries
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "timetable_entries_insert_own" ON timetable_entries;
CREATE POLICY "timetable_entries_insert_own" ON timetable_entries
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- UPDATE: student must own the row AND must not reassign it to another student
DROP POLICY IF EXISTS "timetable_entries_update_own" ON timetable_entries;
CREATE POLICY "timetable_entries_update_own" ON timetable_entries
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "timetable_entries_delete_own" ON timetable_entries;
CREATE POLICY "timetable_entries_delete_own" ON timetable_entries
  FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- ============================================================
-- PAYMENT ITEMS — tighten DELETE to department ownership
-- Replace the broad "manage" policy with split policies
-- ============================================================
DROP POLICY IF EXISTS "payment_items_manage" ON payment_items;

-- Course reps can only INSERT/UPDATE/DELETE their own department's items
DROP POLICY IF EXISTS "payment_items_insert_dept" ON payment_items;
CREATE POLICY "payment_items_insert_dept" ON payment_items
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_role() IN ('governor', 'financial_secretary', 'developer')
    OR (
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND department_id = auth_department()
    )
  );

DROP POLICY IF EXISTS "payment_items_update_dept" ON payment_items;
CREATE POLICY "payment_items_update_dept" ON payment_items
  FOR UPDATE TO authenticated
  USING (
    auth_role() IN ('governor', 'financial_secretary', 'developer')
    OR (
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND department_id = auth_department()
    )
  )
  WITH CHECK (
    auth_role() IN ('governor', 'financial_secretary', 'developer')
    OR (
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND department_id = auth_department()
    )
  );

-- DELETE: course reps can only delete bills belonging to their own department
DROP POLICY IF EXISTS "payment_items_delete_dept" ON payment_items;
CREATE POLICY "payment_items_delete_dept" ON payment_items
  FOR DELETE TO authenticated
  USING (
    auth_role() IN ('governor', 'financial_secretary', 'developer')
    OR (
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND department_id = auth_department()
    )
  );

-- ============================================================
-- ISSUES — tighten read scope: course reps see only their department
-- ============================================================
DROP POLICY IF EXISTS "issues_read" ON issues;
CREATE POLICY "issues_read" ON issues
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('governor', 'financial_secretary', 'developer')
    OR (
      -- Course reps only see issues from students in their own department
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND student_id IN (
        SELECT id FROM profiles
        WHERE department_id = auth_department()
          AND role = 'student'
      )
    )
  );

-- Issues UPDATE: course reps can only update issues from their department
DROP POLICY IF EXISTS "issues_update" ON issues;
CREATE POLICY "issues_update" ON issues
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    OR auth_role() IN ('governor', 'developer')
    OR (
      auth_role() IN ('course_rep', 'assistant_course_rep')
      AND student_id IN (
        SELECT id FROM profiles
        WHERE department_id = auth_department()
          AND role = 'student'
      )
    )
  );

-- ============================================================
-- PROFILES — add explicit developer update policy
-- The existing profiles_update_own only covers self-updates.
-- Developers need to update other users' roles/profiles,
-- but must not be able to change another developer's data.
-- ============================================================
DROP POLICY IF EXISTS "profiles_update_developer" ON profiles;
CREATE POLICY "profiles_update_developer" ON profiles
  FOR UPDATE TO authenticated
  USING (
    auth_role() = 'developer'
    AND id != auth.uid()            -- cannot use this path to edit own record
    AND role != 'developer'         -- cannot edit other developers
  )
  WITH CHECK (
    auth_role() = 'developer'
    AND role != 'developer'         -- cannot promote someone to developer via this path
  );

-- audit_log table and its RLS policies are in the next migration file:
-- 20260406000002_create_audit_log.sql
