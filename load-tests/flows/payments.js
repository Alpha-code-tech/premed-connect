/**
 * payments.js — 20% of virtual users
 *
 * Simulates a student going through the payment flow:
 *   1. Fetch available payment items
 *   2. Check their existing payment records (what's already paid)
 *   3. Simulate initiating a payment (calls the app's own verify endpoint)
 *      → Does NOT hit Paystack; uses a clearly fake reference that will
 *        be rejected by the Edge Function, which is intentional — we are
 *        testing the *response time and error path*, not the happy path.
 *   4. Fetch updated payment history
 *
 * ⚠️  IMPORTANT: To test the happy payment path you would need a Paystack
 *     test-mode API key and use their test card numbers. That is separate
 *     from this load test. Here we only confirm the endpoint responds within
 *     acceptable time under load.
 */

import http from 'k6/http'
import { check } from 'k6'
import { authHeaders, apiUrl, BASE_URL, checkGet, thinkTime } from '../utils/helpers.js'
import { fakePaystackRef, TEST_STUDENT_IDS, DEPARTMENT_IDS, pick } from '../utils/data.js'

export function paymentFlow() {
  const studentId = pick(TEST_STUDENT_IDS)
  const deptId    = pick(DEPARTMENT_IDS)

  // ── 1. Fetch available payment items ──────────────────────────────────────
  const items = http.get(
    apiUrl('payment_items', `select=id,title,amount,deadline&or=(department_id.is.null,department_id.eq.${deptId})&order=created_at.desc`),
    { headers: authHeaders() },
  )
  checkGet(items, 'Payment items list')
  thinkTime(2, 4)  // user reads the items, decides what to pay

  // ── 2. Check which items are already paid ─────────────────────────────────
  const paid = http.get(
    apiUrl('payments', `select=payment_item_id,status&student_id=eq.${studentId}&status=eq.successful`),
    { headers: authHeaders() },
  )
  checkGet(paid, 'Paid items check')
  thinkTime(1, 2)

  // ── 3. Simulate payment verification call (Edge Function) ─────────────────
  // This calls the Supabase Edge Function that verifies a Paystack reference.
  // We pass a clearly fake reference — the function will return an error,
  // but we verify it responds promptly and doesn't time out under load.
  //
  // The Edge Function URL pattern: /functions/v1/verify-payment
  const SUPABASE_URL = __ENV.SUPABASE_URL || ''
  if (SUPABASE_URL) {
    const verifyRes = http.post(
      `${SUPABASE_URL}/functions/v1/verify-payment`,
      JSON.stringify({
        reference:       fakePaystackRef(),
        student_id:      studentId,
        payment_item_id: 'k6-test-item-id',  // fake — will 404 in the function
      }),
      {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${__ENV.AUTH_TOKEN || ''}`,
          'apikey':        __ENV.ANON_KEY || '',
        },
      },
    )
    // We expect 400 or 422 (bad reference) — that is the CORRECT behaviour.
    // A 500 or a timeout would be a problem.
    check(verifyRes, {
      'Payment verify — edge fn responds':    r => r.status !== 0,
      'Payment verify — not a server crash':  r => r.status < 500,
      'Payment verify — responds < 5s':       r => r.timings.duration < 5000,
    })
  }
  thinkTime(1, 2)

  // ── 4. Fetch payment history (user checks if status updated) ──────────────
  const history = http.get(
    apiUrl('payments', `select=id,status,amount,created_at&student_id=eq.${studentId}&order=created_at.desc&limit=10`),
    { headers: authHeaders() },
  )
  checkGet(history, 'Payment history')
  thinkTime(1, 3)
}
