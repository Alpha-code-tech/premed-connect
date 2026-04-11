import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trophy, Medal, Clock, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklyChallengeTest {
  id: string
  title: string
  subject: string
  department_id: string | null
  weekly_challenge_start_date: string
}

interface LeaderboardEntry {
  rank: number
  student_id: string
  full_name: string
  department_name: string | null
  percentage: number
  time_taken_seconds: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns Monday 00:00:00 WAT (UTC+1) of the given date, expressed as UTC */
function weekStartWAT(date = new Date()): Date {
  const WAT_OFFSET_MS = 60 * 60 * 1000 // UTC+1
  const watMs = date.getTime() + WAT_OFFSET_MS
  const dow = new Date(watMs).getUTCDay() // 0=Sun
  const daysToMon = dow === 0 ? 6 : dow - 1
  const monWat = new Date(watMs - daysToMon * 86400000)
  monWat.setUTCHours(0, 0, 0, 0)
  return new Date(monWat.getTime() - WAT_OFFSET_MS)
}

/** Human-readable date range for a week starting on `ws` (Mon–Sun WAT) */
function weekRangeLabel(ws: Date): string {
  const sunWAT = new Date(ws.getTime() + 6 * 86400000 + WAT_OFFSET_MS)
  sunWAT.setUTCHours(23, 59, 59, 0)
  const monLocal = new Date(ws.getTime() + WAT_OFFSET_MS)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const fmtYear = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(monLocal)} – ${fmtYear(sunWAT)}`
}
const WAT_OFFSET_MS = 60 * 60 * 1000

function formatTime(secs: number | null): string {
  if (secs === null) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
        <Trophy className="h-4 w-4 text-white" />
      </div>
    )
  if (rank === 2)
    return (
      <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center shrink-0">
        <Medal className="h-4 w-4 text-white" />
      </div>
    )
  if (rank === 3)
    return (
      <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center shrink-0">
        <Medal className="h-4 w-4 text-white" />
      </div>
    )
  return (
    <div className="w-8 h-8 rounded-full bg-brand-pale border border-brand-border flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-brand-grey">{rank}</span>
    </div>
  )
}

function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isMe
          ? 'bg-brand-pale border-brand-primary ring-1 ring-brand-primary/30'
          : 'bg-white border-brand-border'
      }`}
    >
      <RankBadge rank={entry.rank} />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isMe ? 'text-brand-primary' : 'text-brand-text'
          }`}
        >
          {entry.full_name}
          {isMe && <span className="ml-1 text-xs font-normal text-brand-grey">(you)</span>}
        </p>
        {entry.department_name && (
          <p className="text-xs text-brand-grey truncate">{entry.department_name}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-brand-text">{entry.percentage}%</p>
        <p className="text-xs text-brand-grey flex items-center gap-1 justify-end">
          <Clock className="h-3 w-3" />
          {formatTime(entry.time_taken_seconds)}
        </p>
      </div>
    </div>
  )
}

function TestLeaderboard({
  test,
  currentUserId,
}: {
  test: WeeklyChallengeTest
  currentUserId: string
}) {
  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const { data: entries, isLoading } = useQuery({
    queryKey: ['leaderboard-entries', test.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_attempts')
        .select(
          'student_id, percentage, time_taken_seconds, profiles:student_id(full_name, departments:department_id(name))',
        )
        .eq('test_id', test.id)
        .not('submitted_at', 'is', null)
        .order('percentage', { ascending: false })
        .order('time_taken_seconds', { ascending: true, nullsFirst: false })

      if (error) throw error

      // One entry per student — keep best attempt (first after ORDER BY)
      const seen = new Set<string>()
      const ranked: LeaderboardEntry[] = []
      for (const row of data ?? []) {
        if (seen.has(row.student_id)) continue
        seen.add(row.student_id)
        const profile = row.profiles as unknown as {
          full_name: string
          departments: { name: string } | null
        } | null
        ranked.push({
          rank: ranked.length + 1,
          student_id: row.student_id,
          full_name: profile?.full_name ?? 'Unknown',
          department_name: (profile?.departments as { name: string } | null)?.name ?? null,
          percentage: row.percentage,
          time_taken_seconds: row.time_taken_seconds,
        })
      }
      return ranked
    },
  })

  // Live updates via Realtime
  useEffect(() => {
    channelRef.current = supabase
      .channel(`lb-${test.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mock_attempts', filter: `test_id=eq.${test.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['leaderboard-entries', test.id] }),
      )
      .subscribe()
    return () => { channelRef.current?.unsubscribe() }
  }, [test.id, queryClient])

  if (isLoading)
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    )

  if (!entries?.length)
    return (
      <div className="text-center py-10 text-brand-grey text-sm p-4">
        No submissions yet — be the first to complete this challenge!
      </div>
    )

  const top10 = entries.slice(0, 10)
  const myEntry = entries.find(e => e.student_id === currentUserId)
  const myInTop10 = top10.some(e => e.student_id === currentUserId)

  return (
    <div className="p-4 space-y-2">
      {top10.map(e => (
        <EntryRow key={e.student_id} entry={e} isMe={e.student_id === currentUserId} />
      ))}

      {myEntry && !myInTop10 && (
        <>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-brand-border" />
            <span className="text-xs text-brand-grey">Your position</span>
            <div className="flex-1 border-t border-dashed border-brand-border" />
          </div>
          <EntryRow entry={myEntry} isMe />
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState<string>('current')
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  const currentWeekStart = weekStartWAT()

  const { data: allTests, isLoading: testsLoading } = useQuery({
    queryKey: ['weekly-challenge-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('id, title, subject, department_id, weekly_challenge_start_date')
        .eq('is_weekly_challenge', true)
        .eq('status', 'published')
        .not('weekly_challenge_start_date', 'is', null)
        .order('weekly_challenge_start_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as WeeklyChallengeTest[]
    },
  })

  // Group by Monday-WAT ISO string
  const weekGroups = (() => {
    const map = new Map<string, WeeklyChallengeTest[]>()
    for (const t of allTests ?? []) {
      const key = weekStartWAT(new Date(t.weekly_challenge_start_date)).toISOString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  })()

  const currentWeekKey = currentWeekStart.toISOString()
  const pastWeeks = [...weekGroups.keys()]
    .filter(k => k !== currentWeekKey)
    .sort((a, b) => b.localeCompare(a))

  const visibleTests =
    selectedWeek === 'current'
      ? (weekGroups.get(currentWeekKey) ?? [])
      : (weekGroups.get(selectedWeek) ?? [])

  // Auto-select first test when the week changes
  useEffect(() => {
    setSelectedTestId(visibleTests[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, allTests])

  const activeTest = visibleTests.find(t => t.id === selectedTestId) ?? visibleTests[0] ?? null

  const displayWeekStart =
    selectedWeek === 'current' ? currentWeekStart : new Date(selectedWeek)
  const weekLabel = weekRangeLabel(displayWeekStart)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Weekly Leaderboard
          </h1>
          <p className="text-brand-grey mt-1">
            Ranked by score, then speed. Resets every Monday.
          </p>
        </div>

        <Select value={selectedWeek} onValueChange={v => { setSelectedWeek(v) }}>
          <SelectTrigger className="w-52">
            <ChevronDown className="h-4 w-4 mr-1 text-brand-grey" />
            <SelectValue placeholder="Select week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">This week</SelectItem>
            {pastWeeks.map(ws => (
              <SelectItem key={ws} value={ws}>
                Week of {new Date(ws).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week period banner */}
      <div className="bg-white border border-brand-border rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-brand-grey">
        <Clock className="h-4 w-4 text-brand-primary shrink-0" />
        Challenge period:{' '}
        <span className="font-medium text-brand-text">{weekLabel}</span>
        {selectedWeek === 'current' && (
          <Badge variant="outline" className="ml-auto text-green-700 border-green-300 bg-green-50 text-xs">
            Live
          </Badge>
        )}
      </div>

      {testsLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : visibleTests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-brand-border">
          <Trophy className="h-10 w-10 text-brand-grey mx-auto mb-3 opacity-40" />
          <p className="font-medium text-brand-grey">
            {selectedWeek === 'current'
              ? 'No Weekly Challenge set for this week yet.'
              : 'No challenges recorded for this week.'}
          </p>
          {selectedWeek === 'current' && (
            <p className="text-sm text-brand-grey mt-1">
              Check back after your Course Rep designates a Weekly Challenge test.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Test tabs if multiple challenges this week */}
          {visibleTests.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {visibleTests.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTestId(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    (selectedTestId ?? visibleTests[0].id) === t.id
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-brand-grey border-brand-border hover:border-brand-secondary'
                  }`}
                >
                  {t.subject}: {t.title}
                  {t.department_id === null && (
                    <span className="ml-1.5 text-xs opacity-70">(All Depts)</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTest && (
            <div className="bg-white rounded-lg border border-brand-border overflow-hidden">
              <div className="px-4 py-3 bg-brand-pale border-b border-brand-border flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-text text-sm truncate">{activeTest.title}</p>
                  <p className="text-xs text-brand-grey">
                    {activeTest.subject} ·{' '}
                    {activeTest.department_id ? 'Department challenge' : 'Association-wide challenge'}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  Top 10
                </Badge>
              </div>
              <TestLeaderboard test={activeTest} currentUserId={profile!.id} />
            </div>
          )}
        </>
      )}

      <p className="text-xs text-brand-grey text-center">
        Rankings update in real time. Ties are broken by fastest completion time.
      </p>
    </div>
  )
}
