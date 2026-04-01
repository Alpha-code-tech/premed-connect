import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#0D5C2E', '#1A8A4A', '#4DBD74', '#7DD4A0', '#B2DBC2', '#2E7D52', '#166534', '#14532D', '#86EFAC', '#4ADE80']

export default function GovernorAnalytics() {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['governor-analytics'],
    queryFn: async () => {
      const [studentsRes, paymentsRes, resourcesRes, issuesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select('department_id, created_at').eq('role', 'student'),
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
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Analytics</h1>
        <p className="text-brand-grey mt-1">PreMed Set performance overview</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Students per Department</h2>
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
              <Line type="monotone" dataKey="count" stroke="#0D5C2E" strokeWidth={2} dot={{ fill: '#0D5C2E' }} name="New Students" />
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

        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Payment & Issue Status</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-xs text-brand-grey text-center mb-2">Payments</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analyticsData?.paymentStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? name : ''} labelLine={false}>
                    {analyticsData?.paymentStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1">
              <p className="text-xs text-brand-grey text-center mb-2">Issues</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analyticsData?.issueStatus} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? name : ''} labelLine={false}>
                    {analyticsData?.issueStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
