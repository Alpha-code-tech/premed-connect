import { useQuery } from '@tanstack/react-query'
import { Users, FileText, CreditCard, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AuditLog } from '@/types'

interface ChartDataPoint {
  name: string
  count: number
}

interface OverviewStats {
  totalStudents: number
  pendingRequests: number
  totalResources: number
  totalPayments: number
  chartData: ChartDataPoint[]
  recentActivity: AuditLog[]
}

interface StatCard {
  title: string
  value: string | number
  icon: React.ElementType
  alert?: boolean
}

export default function DeveloperOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<OverviewStats>({
    queryKey: ['developer-overview-stats'],
    queryFn: async () => {
      const [
        { count: totalStudents },
        { count: pendingRequests },
        { count: totalResources },
        { data: paymentsData },
        { data: deptStudents },
        { data: departments },
        { data: recentActivity },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .not('department_id', 'is', null),
        supabase
          .from('access_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').eq('status', 'successful'),
        supabase.from('profiles').select('department_id').not('department_id', 'is', null),
        supabase.from('departments').select('id, name'),
        supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const totalPayments =
        paymentsData?.reduce((sum, p: { amount: number }) => sum + p.amount, 0) ?? 0

      const deptNameMap = Object.fromEntries(
        (departments ?? []).map((d: { id: string; name: string }) => [d.id, d.name])
      )

      const deptCount: Record<string, number> = {}
      deptStudents?.forEach((s: { department_id: string | null }) => {
        const name = s.department_id
          ? (deptNameMap[s.department_id] ?? 'Unknown')
          : 'Unknown'
        deptCount[name] = (deptCount[name] ?? 0) + 1
      })

      const chartData: ChartDataPoint[] = Object.entries(deptCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      return {
        totalStudents: totalStudents ?? 0,
        pendingRequests: pendingRequests ?? 0,
        totalResources: totalResources ?? 0,
        totalPayments,
        chartData,
        recentActivity: (recentActivity ?? []) as AuditLog[],
      }
    },
  })

  const statCards: StatCard[] = [
    { title: 'Total Members', value: stats?.totalStudents ?? 0, icon: Users },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests ?? 0,
      icon: AlertCircle,
      alert: (stats?.pendingRequests ?? 0) > 0,
    },
    { title: 'Total Resources', value: stats?.totalResources ?? 0, icon: FileText },
    {
      title: 'Total Payments',
      value: formatCurrency(stats?.totalPayments ?? 0),
      icon: CreditCard,
    },
  ]

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Platform Overview</h1>
        <p className="text-brand-grey mt-1 text-sm">Live statistics and activity feed</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsLoading
          ? [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))
          : statCards.map(({ title, value, icon: Icon, alert }) => (
              <Card key={title}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-brand-grey">{title}</p>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        alert ? 'bg-red-50' : 'bg-brand-pale'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${alert ? 'text-red-500' : 'text-brand-primary'}`}
                      />
                    </div>
                  </div>
                  <p
                    className={`text-xl sm:text-2xl font-bold ${
                      alert ? 'text-red-600' : 'text-brand-text'
                    }`}
                  >
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Chart + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Members per Department</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (stats?.chartData.length ?? 0) === 0 ? (
              <div className="h-56 flex items-center justify-center">
                <p className="text-sm text-brand-grey">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats?.chartData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#B2DBC2" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderColor: '#B2DBC2',
                      borderRadius: 6,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0D5C2E"
                    radius={[4, 4, 0, 0]}
                    name="Members"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {statsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (stats?.recentActivity.length ?? 0) === 0 ? (
              <p className="text-sm text-brand-grey text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="shrink-0 capitalize text-[10px] leading-tight"
                    >
                      {log.action_type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-brand-grey">{formatDate(log.created_at)}</span>
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
