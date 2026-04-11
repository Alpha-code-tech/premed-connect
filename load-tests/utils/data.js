/**
 * data.js — Randomised test data generators
 *
 * Provides realistic-looking payloads for POST requests so the database
 * receives varied data rather than identical rows on every iteration.
 * All data is clearly marked as test data.
 */

// ── Issue categories (must match the app's category list) ────────────────────

const ISSUE_CATEGORIES = [
  'payment',
  'academic',
  'portal_access',
  'technical',
  'other',
]

const ISSUE_DESCRIPTIONS = [
  'I am unable to access my portal after the recent update. Please help.',
  'My payment for the association dues was deducted but not marked as successful.',
  'I cannot view the uploaded resources for Anatomy course materials.',
  'The mock exam timer is not counting down correctly during my session.',
  'I submitted my issue report last week but have not received a response.',
  'My department shows incorrectly as N/A even though I enrolled correctly.',
  'The announcement section is not loading on my mobile device.',
  'I cannot download the uploaded PDF resources — download fails silently.',
  'My exam result is showing 0% even though I answered all questions.',
  'I need my matric number corrected — it was entered with a typo.',
  'The leaderboard is not reflecting my recent mock exam submission.',
  'Two payment items are showing as pending even though I paid for both.',
  'I am not receiving any notification emails for announcements.',
  'My profile picture upload fails every time I try to update it.',
  'The timetable I created is not saving — it disappears after I close the tab.',
]

// ── Department IDs (replace with real UUIDs from your Supabase departments table) ──

export const DEPARTMENT_IDS = [
  // These are placeholders — replace with real UUIDs from your departments table
  // Run: SELECT id FROM departments ORDER BY name;
  'dept-placeholder-001',
  'dept-placeholder-002',
  'dept-placeholder-003',
  'dept-placeholder-004',
  'dept-placeholder-005',
]

// ── Student IDs used for payment simulation ───────────────────────────────────

// These should be UUIDs of seeded test user accounts in your database.
// Replace with real profile IDs from: SELECT id FROM profiles WHERE role = 'student' LIMIT 20;
export const TEST_STUDENT_IDS = [
  'student-placeholder-001',
  'student-placeholder-002',
  'student-placeholder-003',
]

// ── Random data helpers ───────────────────────────────────────────────────────

/** Pick a random element from an array */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Generate a random issue payload */
export function randomIssue(studentId) {
  return {
    student_id:  studentId,
    category:    pick(ISSUE_CATEGORIES),
    description: pick(ISSUE_DESCRIPTIONS) + ` [k6-test-${Date.now()}]`,
    status:      'open',
  }
}

/**
 * Generate a simulated payment initiation payload.
 * NOTE: This hits your own app's payment flow — NOT Paystack directly.
 * The Edge Function call is what we're load-testing here; we do NOT
 * submit real transactions to Paystack.
 */
export function randomPaymentPayload(studentId, paymentItemId) {
  return {
    student_id:      studentId,
    payment_item_id: paymentItemId,
    // This is a fake Paystack reference — the Edge Function validation
    // will reject it, which is fine; we're testing response time and error handling.
    paystack_reference: `k6_test_ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    amount: Math.floor(Math.random() * 5000) + 1000,  // ₦1,000 – ₦6,000
  }
}

/** Generate a random Paystack-style test reference (safe, never charged) */
export function fakePaystackRef() {
  return `k6_NOCHARGE_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}
