-- Weekly Leaderboard
-- Adds weekly challenge designation to mock tests and time tracking to attempts.

-- ── Schema changes ─────────────────────────────────────────────────────────────

-- Mark a test as the official Weekly Challenge for a given week.
-- weekly_challenge_start_date records exactly when it was designated, which lets
-- us bucket challenges into weeks (Mon–Sun WAT) for the Previous Weeks history.
ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS is_weekly_challenge       boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_challenge_start_date timestamptz;

-- Track how long a student took so faster completions break score ties.
ALTER TABLE public.mock_attempts
  ADD COLUMN IF NOT EXISTS time_taken_seconds integer;

-- ── RLS additions ──────────────────────────────────────────────────────────────

-- All authenticated users can read any profile row (needed for leaderboard name /
-- department display). This portal is a closed university system — every user is
-- a verified member.
DROP POLICY IF EXISTS "profiles_read_all_authenticated" ON public.profiles;
CREATE POLICY "profiles_read_all_authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can read submitted attempts for weekly challenge tests.
-- This is what powers the cross-department leaderboard.
DROP POLICY IF EXISTS "mock_attempts_read_weekly_challenge" ON public.mock_attempts;
CREATE POLICY "mock_attempts_read_weekly_challenge"
  ON public.mock_attempts FOR SELECT TO authenticated
  USING (
    submitted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.mock_tests mt
      WHERE mt.id = mock_attempts.test_id
        AND mt.is_weekly_challenge = true
    )
  );

-- Course reps / governors can update mock_tests (to set/clear the weekly challenge flag)
DROP POLICY IF EXISTS "mock_tests_update_by_rep" ON public.mock_tests;
CREATE POLICY "mock_tests_update_by_rep"
  ON public.mock_tests FOR UPDATE TO authenticated
  USING   (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'))
  WITH CHECK (auth_role() IN ('course_rep', 'assistant_course_rep', 'governor', 'developer'));
