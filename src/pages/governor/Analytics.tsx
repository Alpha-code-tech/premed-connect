import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

// ── CSS conic-gradient pie chart — zero Recharts, works perfectly on mobile ──

interface PieSlice {
  name: string
  value: number
  color: string
}

function CssPieChart({ slices, emptyMessage }: { slices: PieSlice[]; emptyMessage: string }) {
  const total = slices.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-brand-pale flex items-center justify-center mb-2">
          <span className="text-brand-grey text-lg">—</span>
        </div>
        <p className="text-sm text-brand-grey">{emptyMessage}</p>
      </div>
    )
  }

  let cumulative = 0
  const stops = slices
    .filter(s => s.value > 0)
    .map(s => {
      const pct = (s.value / total) * 100
      const start = cumulative
      cumulative += pct
      return `${s.color} ${start.toFixed(2)}% ${cumulative.toFixed(2)}%`
    })

  return (
    <div>
      <div
        className="mx-auto"
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `conic-gradient(${stops.join(', ')})`,
        }}
      />
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {slices.map(s => {
          const pct = Math.round((s.value / total) * 100)
          return (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-brand-grey capitalize">
                {s.name}: <strong className="text-brand-text">{s.value}</strong>
                {' '}({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GovernorAnalytics() {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['governor-analytics'],
    queryFn: async () => {
      const [studentsRes, paymentsRes, resourcesRes, issuesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select('department_id, created_at').not('department_id', 'is', null),
        supabase.from('payments').select('amount, status, created_at, profiles:student_id(department_id)'),
        supabase.from('resources').select('subject, created_at'),
        supabase.from('issues').select('status, created_at'),
        supabase.from('departments').select('id, name').order('name'),
      ])

      const departments = deptsRes.data || []

      // Students per department
      const studentsByDept = departments.map(dept => ({
        name: dept.name.split(' ').slice(0, 2).join(' '),
        fullName: dept.name,
        students: studentsRes.data?.filter(s => s.department_id === dept.id).length ?? 0,
      }))

      // Revenue per department
      const revenueByDept = departments.map(dept => {
        const deptPayments = paymentsRes.data?.filter(p => {
          const profile = p.profiles as { department_id?: string } | null
          return profile?.department_id === dept.id && p.status === 'successful'
        }) ?? []
        return {
          name: dept.name.split(' ').slice(0, 2).join(' '),
          revenue: deptPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        }
      }).filter(d => d.revenue > 0)

      // Payment status breakdown
      const statusCounts = { successful: 0, pending: 0, failed: 0 }
      paymentsRes.data?.forEach(p => {
        if (p.status in statusCounts) statusCounts[p.status as keyof typeof statusCounts]++
      })
      const paymentStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

      // Issues by status
      const issueCounts = { open: 0, in_progress: 0, resolved: 0 }
      issuesRes.data?.forEach(i => {
        if (i.status in issueCounts) issueCounts[i.status as keyof typeof issueCounts]++
      })
      const issueStatus = Object.entries(issueCounts).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
      }))

      // Monthly enrollment (last 6 months)
      const now = new Date()
      const monthlyEnrollment = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const month = d.toLocaleString('default', { month: 'short' })
        const count = studentsRes.data?.filter(s => {
          const created = new Date(s.created_at)
          return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth()
        }).length ?? 0
        return { month, count }
      })

      return { studentsByDept, revenueByDept, paymentStatus, issueStatus, monthlyEnrollment }
    },
  })

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      </div>
    )
  }

  const paymentSlices: PieSlice[] = [
    { name: 'successful', value: analyticsData?.paymentStatus.find(p => p.name === 'successful')?.value ?? 0, color: '#1A8A4A' },
    { name: 'pending',    value: analyticsData?.paymentStatus.find(p => p.name === 'pending')?.value ?? 0,    color: '#F59E0B' },
    { name: 'failed',     value: analyticsData?.paymentStatus.find(p => p.name === 'failed')?.value ?? 0,     color: '#EF4444' },
  ]

  const issueSlices: PieSlice[] = [
    { name: 'open',        value: analyticsData?.issueStatus.find(p => p.name === 'open')?.value ?? 0,        color: '#F59E0B' },
    { name: 'in progress', value: analyticsData?.issueStatus.find(p => p.name === 'in progress')?.value ?? 0, color: '#3B82F6' },
    { name: 'resolved',    value: analyticsData?.issueStatus.find(p => p.name === 'resolved')?.value ?? 0,    color: '#1A8A4A' },
  ]

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Analytics</h1>
        <p className="text-brand-grey mt-1 text-sm">PreMed Set performance overview</p>
      </div>

      {/* Bar / line charts — 2-col at lg */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Members per Department</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analyticsData?.studentsByDept} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F5ED" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _, p) => [v, p.payload.fullName]} />
              <Bar dataKey="students" fill="#0D5C2E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Monthly Enrollment</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analyticsData?.monthlyEnrollment} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F5ED" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0D5C2E" strokeWidth={2} dot={{ fill: '#0D5C2E' }} name="New Members" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Revenue by Department</h2>
          {analyticsData?.revenueByDept.length === 0 ? (
            <p className="text-brand-grey text-sm">No payment data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData?.revenueByDept} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F5ED" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v as number)} />
                <Bar dataKey="revenue" fill="#1A8A4A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie charts — CSS conic-gradient, stacked on mobile, side-by-side at sm+ */}
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Payment Status</h2>
          <CssPieChart slices={paymentSlices} emptyMessage="No payment data yet" />
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Issue Status</h2>
          <CssPieChart slices={issueSlices} emptyMessage="No issues reported yet" />
        </div>
      </div>
    </div>
  )
}
