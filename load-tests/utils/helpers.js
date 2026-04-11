/**
 * helpers.js — Shared utilities for all load test flows
 *
 * This app is a React SPA backed by Supabase (PostgREST REST API).
 * All "API" calls go to the Supabase project URL, not the frontend domain.
 */

import { check, sleep } from 'k6'
import http from 'k6/http'

// ── Environment configuration ────────────────────────────────────────────────

export const BASE_URL     = __ENV.BASE_URL      || 'https://premedconnect.xyz'
export const SUPABASE_URL = __ENV.SUPABASE_URL  || ''   // e.g. https://xxxx.supabase.co
export const ANON_KEY     = __ENV.ANON_KEY      || ''   // Supabase anon/publishable key
export const AUTH_TOKEN   = __ENV.AUTH_TOKEN    || ''   // JWT from a seeded test account

// Fail fast if critical env vars are missing
export function assertEnv() {
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL env var is required')
  if (!ANON_KEY)     throw new Error('ANON_KEY env var is required')
  if (!AUTH_TOKEN)   throw new Error('AUTH_TOKEN env var is required (pre-generated test JWT)')
}

// ── Standard headers ─────────────────────────────────────────────────────────

/** Headers for authenticated Supabase REST requests */
export function authHeaders(extraHeaders = {}) {
  return {
    'Content-Type':  'application/json',
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Accept':        'application/json',
    ...extraHeaders,
  }
}

/** Headers for unauthenticated public requests */
export function publicHeaders() {
  return {
    'Accept':       'text/html,application/json',
    'User-Agent':   'k6-load-test/1.0',
    'Cache-Control':'no-cache',
  }
}

// ── Supabase REST URL builder ─────────────────────────────────────────────────

/**
 * Build a PostgREST endpoint URL.
 * @param {string} table   - Table name (e.g. 'announcements')
 * @param {string} params  - Query string (e.g. 'select=*&order=created_at.desc')
 */
export function apiUrl(table, params = 'select=*') {
  return `${SUPABASE_URL}/rest/v1/${table}?${params}`
}

// ── Check helpers ─────────────────────────────────────────────────────────────

/** Assert response is a successful GET (200) */
export function checkGet(res, label) {
  check(res, {
    [`${label} — status 200`]:      r => r.status === 200,
    [`${label} — response < 2s`]:   r => r.timings.duration < 2000,
    [`${label} — body not empty`]:  r => r.body && r.body.length > 0,
  })
}

/** Assert response is a successful POST (201) */
export function checkPost(res, label) {
  check(res, {
    [`${label} — status 201`]:     r => r.status === 201,
    [`${label} — response < 3s`]:  r => r.timings.duration < 3000,
  })
}

/** Assert frontend page loads (200 or 304) */
export function checkPage(res, label) {
  check(res, {
    [`${label} — page loaded`]:     r => r.status === 200 || r.status === 304,
    [`${label} — response < 4s`]:   r => r.timings.duration < 4000,
  })
}

// ── Think time ────────────────────────────────────────────────────────────────

/**
 * Simulate realistic user think time between actions.
 * Randomised between min and max seconds.
 */
export function thinkTime(minSecs = 1, maxSecs = 3) {
  sleep(minSecs + Math.random() * (maxSecs - minSecs))
}
