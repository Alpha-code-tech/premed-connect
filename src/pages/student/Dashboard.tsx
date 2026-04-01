import { useQuery } from '@tanstack/react-query'
import { CreditCard, Bell, BookOpen, Calendar, Megaphone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateShort } from '@/lib/utils'

export default function StudentDashboard() {
  const { profile } = useAuth()

  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-pending-payments', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data: paymentItems } = await supabase
        .from('payment_items')
        .select('id')
        .or(`department_id.is.null,department_id.eq.${profile!.department_id}`)
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
    queryKey: ['student-announcements', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .or(`department_id.is.null,department_id.eq.${profile!.department_id}`)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['student-recent-resources', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .or(`visibility.eq.all,and(visibility.eq.department,department_id.eq.${profile!.department_id})`)
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
    queryKey: ['department', profile?.department_id],
    enabled: !!profile?.department_id,
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('name').eq('id', profile!.department_id!).single()
      return data
    },
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Welcome back, {profile?.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-brand-grey mt-1">Here's what's happening in your portal today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-brand-border p-4">
          {paymentsLoading ? <Skeleton className="h-16 w-full" /> : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-brand-grey">Pending Payments</p>
                <div className="w-8 h-8 rounded-lg bg-brand-pale flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-brand-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-brand-text">{pendingPayments ?? 0}</p>
              <p className="text-xs text-brand-grey mt-1">Awaiting your action</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-4">
          {notificationsLoading ? <Skeleton className="h-16 w-full" /> : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-brand-grey">Unread Notifications</p>
                <div className="w-8 h-8 rounded-lg bg-brand-pale flex items-center justify-center">
                  <Bell className="h-4 w-4 text-brand-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold text-brand-text">{unreadNotifications ?? 0}</p>
              <p className="text-xs text-brand-grey mt-1">New notifications</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-brand-grey">Department</p>
            <div className="w-8 h-8 rounded-lg bg-brand-pale flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-brand-primary" />
            </div>
          </div>
          <p className="text-sm font-bold text-brand-text line-clamp-2">{department?.name || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  : announcements?.map((a) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources?.map((r) => (
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
  )
}
