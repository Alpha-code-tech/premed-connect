import { useQuery } from '@tanstack/react-query'
import { CreditCard, Bell, BookOpen, Calendar, Megaphone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useEffectiveDepartmentId } from '@/context/ViewModeContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateShort } from '@/lib/utils'
import TopicTracker from '@/components/student/TopicTracker'

// ── Daily quotes ──────────────────────────────────────────────────────────────

const QUOTES = [
  'The secret of getting ahead is getting started.',
  'Excellence is not a destination but a continuous journey.',
  'Study hard, for the well is deep and our brains are shallow.',
  'Medicine is a science of uncertainty and an art of probability.',
  'The expert in anything was once a beginner.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Motivation gets you going, but discipline keeps you growing.',
  'A physician without a knowledge of anatomy is like a blind man carving a statue.',
  'Your only limit is your mind.',
  'Do not watch the clock. Do what it does — keep going.',
  'Push yourself, because no one else is going to do it for you.',
  'Anatomy is the foundation; everything else is built on top of it.',
  'The more that you read, the more things you will know.',
  'Hard work beats talent when talent doesn\'t work hard.',
  'Every expert was once a beginner. Every pro was once an amateur.',
  'Small daily improvements over time lead to stunning results.',
  'Dream big. Start small. Act now.',
  'Healing is a matter of time, but it is sometimes also a matter of opportunity.',
  'Be so good they cannot ignore you.',
  'Your future self is watching you right now — make them proud.',
]

function getDailyQuote(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

// ── Hero circular progress ring (white on dark background) ────────────────────

function HeroRing({ pct }: { pct: number }) {
  const size = 88
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative shrink-0 flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={9} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#ffffff" strokeWidth={9} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
        <span className="text-lg font-bold text-white leading-none">{pct}%</span>
        <span className="text-[10px] text-white/70 leading-none mt-0.5">done</span>
      </span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { profile } = useAuth()
  const effectiveDeptId = useEffectiveDepartmentId(profile?.department_id)
  const dailyQuote = getDailyQuote()

  // Today's date formatted for display
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-pending-payments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data: paymentItems } = await supabase
        .from('payment_items')
        .select('id')
        .or(`department_id.is.null${effectiveDeptId ? `,department_id.eq.${effectiveDeptId}` : ''}`)
      if (!paymentItems?.length) return 0
      const { data: paid } = await supabase
        .from('payments')
        .select('payment_item_id')
        .eq('student_id', profile!.id)
        .eq('status', 'successful')
      const paidIds = new Set(paid?.map(p => p.payment_item_id) || [])
      return paymentItems.filter(item => !paidIds.has(item.id)).length
    },
  })

  const { data: unreadNotifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['student-unread-notifications', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', profile!.id)
        .eq('is_read', false)
      return count || 0
    },
  })

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['student-announcements', effectiveDeptId],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .or(`department_id.is.null${effectiveDeptId ? `,department_id.eq.${effectiveDeptId}` : ''}`)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['student-recent-resources', effectiveDeptId],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .or(`visibility.eq.all${effectiveDeptId ? `,and(visibility.eq.department,department_id.eq.${effectiveDeptId})` : ''}`)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ['student-upcoming-timetable', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('student_id', profile!.id)
        .neq('status', 'completed')
        .order('day_of_week')
        .order('start_time')
        .limit(3)
      return data || []
    },
  })

  const { data: department } = useQuery({
    queryKey: ['department', effectiveDeptId],
    enabled: !!effectiveDeptId,
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('name').eq('id', effectiveDeptId!).single()
      return data
    },
  })

  // Course topics — same query key as TopicTracker so React Query shares the cache
  const { data: topics } = useQuery({
    queryKey: ['course-topics', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_topics')
        .select('is_completed')
        .eq('student_id', profile!.id)
      if (error) throw error
      return data ?? []
    },
  })

  const totalTopics = topics?.length ?? 0
  const completedTopics = topics?.filter(t => t.is_completed).length ?? 0
  const studyPct = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0

  const firstName = profile?.full_name.split(' ')[0] ?? ''

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Dark gradient hero header ────────────────────────────────────────── */}
      <div
        className="px-4 py-6 sm:px-6 sm:py-8 md:px-10"
        style={{ background: 'linear-gradient(135deg, #0D5C2E 0%, #16A085 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">

          {/* Left: greeting, date, dept, quote */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-white/70 text-sm font-medium">{todayLabel}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              Welcome back, {firstName}
            </h1>
            {department?.name && (
              <p className="text-white/80 text-sm">
                {department.name}
              </p>
            )}
            <p className="text-white/60 text-sm italic leading-relaxed max-w-md pt-1">
              "{dailyQuote}"
            </p>
          </div>

          {/* Right: study progress ring */}
          {totalTopics > 0 && (
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <HeroRing pct={studyPct} />
              <p className="text-white/70 text-xs text-center">Study Progress</p>
              <p className="text-white/50 text-[11px] text-center">{completedTopics}/{totalTopics} topics</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-brand-border p-3 sm:p-4">
            {paymentsLoading ? <Skeleton className="h-14 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-brand-grey">Payments Due</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-pale flex items-center justify-center shrink-0">
                    <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-primary" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-brand-text">{pendingPayments ?? 0}</p>
                <p className="text-xs text-brand-grey mt-1 hidden sm:block">Awaiting your action</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-lg border border-brand-border p-3 sm:p-4">
            {notificationsLoading ? <Skeleton className="h-14 w-full" /> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm text-brand-grey">Unread</p>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-pale flex items-center justify-center shrink-0">
                    <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-primary" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-brand-text">{unreadNotifications ?? 0}</p>
                <p className="text-xs text-brand-grey mt-1 hidden sm:block">New notifications</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-lg border border-brand-border p-3 sm:p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm text-brand-grey">Department</p>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-pale flex items-center justify-center shrink-0">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-primary" />
              </div>
            </div>
            <p className="text-sm font-bold text-brand-text line-clamp-2">{department?.name || 'N/A'}</p>
          </div>
        </div>

        {/* Announcements + Upcoming Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-brand-primary" /> Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcementsLoading
                  ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  : announcements?.length === 0
                    ? <p className="text-sm text-brand-grey text-center py-4">No announcements yet</p>
                    : announcements?.slice(0, 3).map((a) => (
                      <div key={a.id} className="p-3 rounded-lg bg-brand-pale/50 border border-brand-border">
                        <h3 className="font-medium text-sm text-brand-text">{a.title}</h3>
                        <p className="text-xs text-brand-grey mt-1 line-clamp-2">{a.body}</p>
                        <p className="text-xs text-brand-grey mt-1">{formatDateShort(a.created_at)}</p>
                      </div>
                    ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-primary" /> Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {timetableLoading
                  ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                  : timetable?.length === 0
                    ? <p className="text-sm text-brand-grey text-center py-4">No upcoming sessions</p>
                    : timetable?.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg bg-brand-pale/50 border border-brand-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-brand-primary bg-brand-pale px-2 py-0.5 rounded">
                            {entry.day_of_week}
                          </span>
                          <span className="text-xs text-brand-grey">{entry.start_time}</span>
                        </div>
                        <p className="text-sm font-medium text-brand-text mt-1">{entry.subject}</p>
                        <p className="text-xs text-brand-grey">{entry.topic}</p>
                      </div>
                    ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Topic tracker summary */}
        <TopicTracker summaryOnly />

        {/* Recent resources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-primary" /> Recent Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resourcesLoading ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : resources?.length === 0 ? (
              <p className="text-sm text-brand-grey text-center py-4">No resources available yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {resources?.slice(0, 3).map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-brand-pale/50 border border-brand-border">
                    <Badge variant="outline" className="text-xs mb-1">{r.file_type}</Badge>
                    <p className="text-sm font-medium text-brand-text line-clamp-1">{r.title}</p>
                    <p className="text-xs text-brand-grey mt-1">{r.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
