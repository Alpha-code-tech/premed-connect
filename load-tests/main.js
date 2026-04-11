/**
 * ============================================================
 * PreMed Connect — k6 Load Test
 * ============================================================
 *
 * Target:    https://premedconnect.xyz  (Supabase backend)
 * Peak load: 700 concurrent virtual users
 *
 * User distribution:
 *   40% Browse (homepage, announcements, resources, exams)
 *   25% Issue submission (read list, POST new issue, verify)
 *   20% Payments (list items, check paid, call verify endpoint)
 *   15% Mixed (notifications, timetable, leaderboard, issue)
 *
 * Run:
 *   k6 run \
 *     -e SUPABASE_URL=https://xxxx.supabase.co \
 *     -e ANON_KEY=eyJhbGci... \
 *     -e AUTH_TOKEN=eyJhbGci... \
 *     load-tests/main.js
 * ============================================================
 */

import { sleep } from 'k6'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js'
import { browseFlow }       from './flows/browse.js'
import { issueSubmissionFlow } from './flows/issues.js'
import { paymentFlow }      from './flows/payments.js'
import { mixedFlow }        from './flows/mixed.js'
import { assertEnv }        from './utils/helpers.js'

// ── Validate environment before any VU starts ────────────────────────────────

export function setup() {
  assertEnv()
  console.log(`
  ┌─────────────────────────────────────────────┐
  │   PreMed Connect Load Test — Starting        │
  │   Target: ${__ENV.SUPABASE_URL}
  │   Peak VUs: 700                              │
  │   Duration: ~9 minutes                       │
  └─────────────────────────────────────────────┘
  `)
}

// ── Load profile ──────────────────────────────────────────────────────────────
//
// We use four named scenarios — one per user flow — each with proportional
// VU counts and identical ramp-up stages. This lets k6 report per-scenario
// metrics so you can see which flow is the bottleneck.
//
// Stage breakdown:
//   0→100 VUs   over  30s  (warm-up)
//   100→300 VUs over  60s  (ramp)
//   300→700 VUs over 120s  (stress ramp)
//   700 VUs     for  240s  (sustained peak — 4 minutes)
//   700→0 VUs   over  60s  (cool-down)
//
// Total duration: ~510s ≈ 8.5 minutes

const STAGES = [
  { duration: '30s',  target: 40  },  // 40% of 100
  { duration: '60s',  target: 120 },  // 40% of 300
  { duration: '120s', target: 280 },  // 40% of 700
  { duration: '240s', target: 280 },  // sustained peak
  { duration: '60s',  target: 0   },  // cool-down
]

export const options = {
  scenarios: {
    // ── 40% — Browse ────────────────────────────────────────────────────────
    browse: {
      executor:         'ramping-vus',
      startVUs:         0,
      stages: [
        { duration: '30s',  target: 40  },
        { duration: '60s',  target: 120 },
        { duration: '120s', target: 280 },
        { duration: '240s', target: 280 },
        { duration: '60s',  target: 0   },
      ],
      gracefulRampDown: '15s',
      exec:             'browse',
    },

    // ── 25% — Issue submission ───────────────────────────────────────────────
    issues: {
      executor:         'ramping-vus',
      startVUs:         0,
      stages: [
        { duration: '30s',  target: 25  },
        { duration: '60s',  target: 75  },
        { duration: '120s', target: 175 },
        { duration: '240s', target: 175 },
        { duration: '60s',  target: 0   },
      ],
      gracefulRampDown: '15s',
      exec:             'issues',
    },

    // ── 20% — Payments ───────────────────────────────────────────────────────
    payments: {
      executor:         'ramping-vus',
      startVUs:         0,
      stages: [
        { duration: '30s',  target: 20  },
        { duration: '60s',  target: 60  },
        { duration: '120s', target: 140 },
        { duration: '240s', target: 140 },
        { duration: '60s',  target: 0   },
      ],
      gracefulRampDown: '15s',
      exec:             'payments',
    },

    // ── 15% — Mixed ──────────────────────────────────────────────────────────
    mixed: {
      executor:         'ramping-vus',
      startVUs:         0,
      stages: [
        { duration: '30s',  target: 15  },
        { duration: '60s',  target: 45  },
        { duration: '120s', target: 105 },
        { duration: '240s', target: 105 },
        { duration: '60s',  target: 0   },
      ],
      gracefulRampDown: '15s',
      exec:             'mixed',
    },
  },

  // ── Pass/fail thresholds ────────────────────────────────────────────────────
  //
  // k6 will mark the run as FAILED if any of these are breached.
  // Tune these to match your SLA targets.
  thresholds: {
    // 95th percentile of ALL requests must be under 2 seconds
    'http_req_duration':                       ['p(95)<2000'],
    // 99th percentile under 4 seconds (handles occasional spikes)
    'http_req_duration{scenario:browse}':      ['p(95)<1500', 'p(99)<3000'],
    'http_req_duration{scenario:issues}':      ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{scenario:payments}':    ['p(95)<3000', 'p(99)<5000'],
    'http_req_duration{scenario:mixed}':       ['p(95)<2500', 'p(99)<4000'],
    // Error rate must stay below 2%
    'http_req_failed':                         ['rate<0.02'],
    // Checks pass rate must be above 95%
    'checks':                                  ['rate>0.95'],
  },
}

// ── Scenario entry points ─────────────────────────────────────────────────────
// k6 requires exported functions matching the `exec` names in scenarios above.

export function browse()   { browseFlow()   }
export function issues()   { issueSubmissionFlow() }
export function payments() { paymentFlow()  }
export function mixed()    { mixedFlow()    }

// ── Custom summary output ─────────────────────────────────────────────────────
//
// Generates both the default terminal summary AND a JSON file for CI/CD
// pipeline ingestion or later analysis.

export function handleSummary(data) {
  return {
    // Human-readable summary to stdout
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
    // Machine-readable for CI / Grafana ingestion
    'load-tests/results/summary.json': JSON.stringify(data, null, 2),
  }
}
