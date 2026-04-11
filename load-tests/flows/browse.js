/**
 * browse.js — 40% of virtual users
 *
 * Simulates a student browsing the portal:
 *   1. Load the frontend SPA shell
 *   2. Fetch announcements (global + department-scoped)
 *   3. Fetch recent resources
 *   4. Fetch their dashboard stats (pending payments, notifications)
 *   5. Fetch mock test listing
 */

import http from 'k6/http'
import { authHeaders, publicHeaders, apiUrl, BASE_URL, checkGet, checkPage, thinkTime } from '../utils/helpers.js'
import { pick, DEPARTMENT_IDS } from '../utils/data.js'

export function browseFlow() {
  const deptId = pick(DEPARTMENT_IDS)

  // ── 1. Load the SPA shell (static HTML from Vercel CDN) ──────────────────
  const homePage = http.get(BASE_URL, { headers: publicHeaders() })
  checkPage(homePage, 'SPA shell')
  thinkTime(1, 2)

  // ── 2. Fetch announcements (department + global) ──────────────────────────
  const announcements = http.get(
    apiUrl('announcements', `select=id,title,body,created_at&or=(department_id.is.null,department_id.eq.${deptId})&order=created_at.desc&limit=5`),
    { headers: authHeaders() },
  )
  checkGet(announcements, 'Announcements')
  thinkTime(1, 3)

  // ── 3. Fetch recent resources ─────────────────────────────────────────────
  const resources = http.get(
    apiUrl('resources', `select=id,title,subject,file_type,created_at&or=(visibility.eq.all,and(visibility.eq.department,department_id.eq.${deptId}))&order=created_at.desc&limit=10`),
    { headers: authHeaders() },
  )
  checkGet(resources, 'Resources')
  thinkTime(1, 2)

  // ── 4. Fetch payment items (dashboard pending-payment count) ──────────────
  const paymentItems = http.get(
    apiUrl('payment_items', `select=id,title,amount,deadline&or=(department_id.is.null,department_id.eq.${deptId})`),
    { headers: authHeaders() },
  )
  checkGet(paymentItems, 'Payment items')
  thinkTime(0.5, 1.5)

  // ── 5. Fetch published mock tests ─────────────────────────────────────────
  const exams = http.get(
    apiUrl('mock_tests', `select=id,title,subject,time_limit,is_weekly_challenge&status=eq.published&or=(department_id.is.null,department_id.eq.${deptId})&order=created_at.desc`),
    { headers: authHeaders() },
  )
  checkGet(exams, 'Mock tests list')
  thinkTime(1, 3)
}
