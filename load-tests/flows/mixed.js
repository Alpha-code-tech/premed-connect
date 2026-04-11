/**
 * mixed.js — 15% of virtual users
 *
 * Simulates a power user who does a bit of everything in one session:
 *   1. Check notifications
 *   2. Read announcements
 *   3. Visit timetable
 *   4. Browse resources
 *   5. Check leaderboard (weekly challenge)
 *   6. Submit one issue
 */

import http from 'k6/http'
import { authHeaders, apiUrl, checkGet, checkPost, thinkTime } from '../utils/helpers.js'
import { randomIssue, TEST_STUDENT_IDS, DEPARTMENT_IDS, pick } from '../utils/data.js'

export function mixedFlow() {
  const studentId = pick(TEST_STUDENT_IDS)
  const deptId    = pick(DEPARTMENT_IDS)

  // ── 1. Fetch unread notifications ─────────────────────────────────────────
  const notifications = http.get(
    apiUrl('notifications', `select=id,title,message,urgency,is_read,created_at&student_id=eq.${studentId}&order=created_at.desc&limit=15`),
    { headers: authHeaders() },
  )
  checkGet(notifications, 'Notifications')
  thinkTime(1, 2)

  // ── 2. Read announcements ─────────────────────────────────────────────────
  const announcements = http.get(
    apiUrl('announcements', `select=id,title,body,created_at&or=(department_id.is.null,department_id.eq.${deptId})&order=created_at.desc&limit=5`),
    { headers: authHeaders() },
  )
  checkGet(announcements, 'Announcements (mixed)')
  thinkTime(2, 4)  // user actually reads an announcement

  // ── 3. Fetch timetable entries ────────────────────────────────────────────
  const timetable = http.get(
    apiUrl('timetable_entries', `select=id,subject,topic,day_of_week,start_time,end_time,status&student_id=eq.${studentId}&order=day_of_week&order=start_time`),
    { headers: authHeaders() },
  )
  checkGet(timetable, 'Timetable')
  thinkTime(1, 3)

  // ── 4. Browse resources ───────────────────────────────────────────────────
  const resources = http.get(
    apiUrl('resources', `select=id,title,subject,file_type,visibility&or=(visibility.eq.all,and(visibility.eq.department,department_id.eq.${deptId}))&order=created_at.desc&limit=8`),
    { headers: authHeaders() },
  )
  checkGet(resources, 'Resources (mixed)')
  thinkTime(1, 2)

  // ── 5. Check leaderboard (weekly challenge attempts) ──────────────────────
  // First fetch the active weekly challenge test
  const weeklyTest = http.get(
    apiUrl('mock_tests', `select=id,title,subject&is_weekly_challenge=eq.true&status=eq.published&limit=1`),
    { headers: authHeaders() },
  )
  checkGet(weeklyTest, 'Weekly challenge test')

  // If there is a weekly challenge, fetch its leaderboard entries
  let testId = null
  try {
    const body = JSON.parse(weeklyTest.body)
    if (Array.isArray(body) && body[0]) testId = body[0].id
  } catch (_) {}

  if (testId) {
    const leaderboard = http.get(
      apiUrl('mock_attempts', `select=student_id,percentage,time_taken_seconds&test_id=eq.${testId}&submitted_at=not.is.null&order=percentage.desc&order=time_taken_seconds.asc&limit=10`),
      { headers: authHeaders() },
    )
    checkGet(leaderboard, 'Leaderboard entries')
  }
  thinkTime(1, 2)

  // ── 6. Submit an issue ────────────────────────────────────────────────────
  const issue = http.post(
    apiUrl('issues', ''),
    JSON.stringify(randomIssue(studentId)),
    {
      headers: authHeaders({ 'Prefer': 'return=minimal' }),
    },
  )
  checkPost(issue, 'Issue submit (mixed)')
  thinkTime(1, 2)
}
