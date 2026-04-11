/**
 * issues.js — 25% of virtual users
 *
 * Simulates a student submitting a complaint/issue:
 *   1. Load dashboard
 *   2. Fetch their existing issues (read)
 *   3. Submit a new issue (write)
 *   4. Poll to confirm the issue appears in the list
 */

import http from 'k6/http'
import { check } from 'k6'
import { authHeaders, apiUrl, checkGet, checkPost, thinkTime } from '../utils/helpers.js'
import { randomIssue, TEST_STUDENT_IDS, pick } from '../utils/data.js'

export function issueSubmissionFlow() {
  const studentId = pick(TEST_STUDENT_IDS)

  // ── 1. Fetch existing issues (student reads their history first) ──────────
  const existing = http.get(
    apiUrl('issues', `select=id,category,description,status,created_at&student_id=eq.${studentId}&order=created_at.desc&limit=10`),
    { headers: authHeaders() },
  )
  checkGet(existing, 'Fetch existing issues')
  thinkTime(2, 4)  // user reads through their issues

  // ── 2. Submit a new issue ─────────────────────────────────────────────────
  const payload = randomIssue(studentId)

  const submit = http.post(
    apiUrl('issues', ''),
    JSON.stringify(payload),
    {
      headers: authHeaders({
        // PostgREST: return the inserted row so we can verify it
        'Prefer': 'return=representation',
      }),
    },
  )
  checkPost(submit, 'Submit issue')

  // Also verify the body came back with the new issue's id
  check(submit, {
    'Submit issue — id returned': r => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body) && body[0] && body[0].id
      } catch {
        return false
      }
    },
  })
  thinkTime(1, 2)

  // ── 3. Confirm the issue appears (reload the list after submission) ───────
  const verify = http.get(
    apiUrl('issues', `select=id,status&student_id=eq.${studentId}&order=created_at.desc&limit=1`),
    { headers: authHeaders() },
  )
  checkGet(verify, 'Verify issue saved')
  thinkTime(1, 3)
}
