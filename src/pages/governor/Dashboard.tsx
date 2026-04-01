import { useQuery } from '@tanstack/react-query'
import { Users, CreditCard, Megaphone, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function GovernorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['governor-stats'],
    queryFn: async () => {
      const [studentsRes, paymentsRes, announcementsRes, resourcesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('payments').select('amount').eq('status', 'successful'),
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
      ])
      const totalRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0)
      return {
        students: studentsRes.count || 0,
        revenue: totalRevenue,
        announcements: announcementsRes.count || 0,
        resources: resourcesRes.count || 0,
      }
    },
  })

  const { data: deptStats, isLoading: deptLoading } = useQuery({
    queryKey: ['governor-dept-stats'],
    queryFn: async () => {
      const [profilesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select('department_id').eq('role', 'student'),
        supabase.from('departments').select('id, name'),
      ])
      if (!profilesRes.data) return []
      const deptMap = Object.fromEntries((deptsRes.data || []).map(d => [d.id, d.name]))
      const counts: Record<string, number> = {}
      profilesRes.data.forEach(p => {
        if (p.department_id) counts[p.department_id] = (counts[p.department_id] || 0) + 1
      })
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => [deptMap[id] || id, count] as [string, number])
    },
  })

  const { data: recentAnnouncements } = useQuery({
    queryKey: ['governor-recent-announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  const statCards = [
    { label: 'Total Students', value: stats?.students ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', to: '/governor/departments' },
    { label: 'Total Revenue', value: formatCurrency(stats?.revenue ?? 0), icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', to: '/governor/payments' },
    { label: 'Announcements', value: stats?.announcements ?? 0, icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50', to: '/governor/announcements' },
    { label: 'Resources', value: stats?.resources ?? 0, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50', to: '/governor/analytics' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Governor Dashboard</h1>
        <p className="text-brand-grey mt-1">Overview of PreMed Set activity</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link key={card.label} to={card.to} className="bg-white rounded-lg border border-brand-border p-5 hover:border-brand-accent transition-colors">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-brand-text">{card.value}</p>
                <p className="text-sm text-brand-grey mt-0.5">{card.label}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Students by Department</h2>
          {deptLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : deptStats?.length === 0 ? (
            <p className="text-brand-grey text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {deptStats?.map(([dept, count]) => (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-text truncate">{dept}</span>
                    <span className="text-brand-grey ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="h-2 bg-brand-pale rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full"
                      style={{ width: `${Math.min(100, (count / (stats?.students || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Recent Announcements</h2>
          {recentAnnouncements?.length === 0 ? (
            <p className="text-brand-grey text-sm">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements?.map(a => (
                <div key={a.id} className="border-b border-brand-border pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-brand-text line-clamp-1">{a.title}</p>
                  <p className="text-xs text-brand-grey mt-0.5 line-clamp-2">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
