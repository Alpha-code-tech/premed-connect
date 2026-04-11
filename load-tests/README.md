# PreMed Connect — k6 Load Tests

Production load testing for premedconnect.xyz using [k6](https://k6.io).

---

## Prerequisites — Install k6

### Windows (recommended)
```powershell
winget install k6 --source winget
```
Or download the MSI from https://github.com/grafana/k6/releases/latest

### macOS
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Verify installation:
```bash
k6 version
```

---

## One-time setup — Fill in real values

### Step 1: Get your Supabase credentials
Go to Supabase Dashboard → Project Settings → API:
- **SUPABASE_URL** — the Project URL (e.g. `https://abcdefgh.supabase.co`)
- **ANON_KEY** — the `anon` public key (safe to use in tests)

### Step 2: Get a test AUTH_TOKEN
You need a JWT from a real logged-in test account. Run this in your browser console
while logged in to the portal, or in a Node script:

```js
// In browser console while logged into premedconnect.xyz
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

Or via the Supabase client in a script:
```js
const { data } = await supabase.auth.signInWithPassword({
  email: 'testuser@example.com',
  password: 'testpassword'
})
console.log(data.session.access_token)
```

> **Best practice:** Create a dedicated test student account in Supabase with role `student`
> and a real `department_id`. JWTs expire after 1 hour by default — regenerate before long runs.

### Step 3: Fill in real UUIDs in `utils/data.js`

Open `load-tests/utils/data.js` and replace the placeholder IDs:

```js
// Run in Supabase SQL Editor:
SELECT id FROM departments ORDER BY name;

// Replace DEPARTMENT_IDS array with real UUIDs

SELECT id FROM profiles WHERE role = 'student' LIMIT 5;
// Replace TEST_STUDENT_IDS with real profile UUIDs
```

> The test student IDs are used as the `student_id` in issue and payment records.
> Use accounts that exist in your database or RLS will reject the inserts.

---

## Running the tests

### Quick smoke test (5 VUs, 30 seconds) — run first to verify everything works
```bash
k6 run \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  -e AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --vus 5 --duration 30s \
  load-tests/main.js
```

### Full load test (700 peak VUs, ~9 minutes)
```bash
k6 run \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e ANON_KEY=eyJhbGci... \
  -e AUTH_TOKEN=eyJhbGci... \
  load-tests/main.js
```

### Run a single scenario in isolation
```bash
# Browse flow only, 50 VUs for 60s
k6 run \
  -e SUPABASE_URL=... -e ANON_KEY=... -e AUTH_TOKEN=... \
  --scenario browse \
  --vus 50 --duration 60s \
  load-tests/main.js
```

### Output results to a file (for later analysis)
Results are automatically written to `load-tests/results/summary.json` by the
`handleSummary` function in `main.js`.

---

## Understanding the output

k6 prints a table like this at the end:

```
     ✓ checks.........................: 98.34%  ✓ 18420  ✗ 307
     data_received...................: 145 MB  281 kB/s
     data_sent.......................: 8.2 MB  16 kB/s

   ✓ http_req_duration.............: avg=312ms  min=45ms  med=198ms  max=4.2s  p(90)=890ms  p(95)=1.3s  p(99)=2.9s
       { scenario:browse }.........: avg=201ms
       { scenario:issues }.........: avg=489ms
       { scenario:payments }.......: avg=612ms
       { scenario:mixed }...........: avg=378ms

   ✓ http_req_failed...............: 1.62%   ✓ 18420  ✗ 305
     http_reqs......................: 18725   36.3/s
     vus............................: 700     min=0    max=700
```

### Key metrics to focus on

| Metric | What it means | Healthy target |
|--------|---------------|----------------|
| `p(95)` duration | 95% of requests complete within this time | < 2s |
| `p(99)` duration | Worst-case tail latency | < 4s |
| `http_req_failed` rate | % of requests that failed (non-2xx or network error) | < 2% |
| `checks` rate | % of your explicit `check()` assertions that passed | > 95% |
| `http_reqs` / s | Throughput — requests per second at peak | Baseline it |

### Reading the thresholds

- ✓ = threshold **passed** (your app met the SLA target)
- ✗ = threshold **failed** (your app did NOT meet the target)

A failed threshold means k6 exits with code 99, which fails CI/CD pipelines.

---

## Interpreting results — What to look for

### 🟢 Everything is fine if:
- `p(95)` < 2s across all scenarios
- `http_req_failed` < 2%
- No scenario shows dramatically higher latency than others

### 🟡 Warning signs:
- `p(99)` spikes to 5–10s → database connection pool saturation or slow query
- `http_req_failed` climbs as VUs increase → Supabase rate limiting or connection exhaustion
- `payments` scenario is significantly slower → Edge Function cold starts

### 🔴 Critical issues:
- `http_req_failed` > 5% → something is crashing under load
- Median duration > 2s → even normal users are experiencing slow responses
- k6 itself errors with `WARN[...] connection reset by peer` → Supabase is rejecting connections

---

## Performance improvement suggestions

### If Supabase REST API is slow (p95 > 1.5s):
1. **Add database indexes** on frequently queried columns:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_announcements_dept ON announcements(department_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_issues_student ON issues(student_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id, status);
   CREATE INDEX IF NOT EXISTS idx_mock_attempts_test ON mock_attempts(test_id, submitted_at);
   ```
2. **Increase Supabase connection pool** — upgrade plan or configure PgBouncer in Transaction mode
3. **Use `.select('id,title,...')` instead of `.select('*')`** — already done in the app, keep it up

### If the Edge Function (payment verify) is slow:
1. Cold starts are normal for the first call — Supabase Functions run on Deno
2. **Pin the Edge Function to a specific region** closest to your users (Nigeria → `eu-west-2` is closest currently, `af-south-1` is not yet available on free tier)
3. Keep the function warm with a scheduled ping (Supabase Cron or external heartbeat)

### If the frontend (Vercel CDN) is slow:
- This is almost never the bottleneck — Vercel's CDN is globally distributed
- If the SPA shell check fails, check your `vercel.json` cache headers

### If issues or payments have high error rates:
- Check Supabase RLS policies — test user must satisfy all policies
- Check that `TEST_STUDENT_IDS` in `data.js` are real profile UUIDs
- Check that the anon key has correct permissions

---

## File structure

```
load-tests/
├── main.js              ← Entry point — scenarios, thresholds, summary
├── flows/
│   ├── browse.js        ← 40% VUs: homepage, announcements, resources, exams
│   ├── issues.js        ← 25% VUs: fetch + submit issues
│   ├── payments.js      ← 20% VUs: payment items, paid check, verify endpoint
│   └── mixed.js         ← 15% VUs: notifications, timetable, leaderboard, issue
├── utils/
│   ├── helpers.js       ← Shared: URL builder, headers, check wrappers, thinkTime
│   └── data.js          ← Random payload generators, IDs
├── results/
│   └── summary.json     ← Auto-generated after each run
└── README.md            ← This file
```
