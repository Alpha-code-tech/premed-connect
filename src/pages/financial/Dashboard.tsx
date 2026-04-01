import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export default function FinancialDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['financial-stats'],
    queryFn: async () => {
      const [paymentsRes, deptsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, status, profiles:student_id(department_id), payment_items:payment_item_id(title)'),
        supabase.from('departments').select('id, name').order('name'),
      ])

      const payments = paymentsRes.data || []
      const departments = deptsRes.data || []

      const paid = payments.filter(p => p.status === 'successful')
      const pending = payments.filter(p => p.status === 'pending')
      const overdue = payments.filter(p => p.status === 'failed')

      const totalRevenue = paid.reduce((sum, p) => sum + (p.amount || 0), 0)
      const pendingAmount = pending.reduce((sum, p) => sum + (p.amount || 0), 0)

      const byDept = departments.map(dept => {
        const deptPaid = paid.filter(p => {
          const profile = p.profiles as { department_id?: string } | null
          return profile?.department_id === dept.id
        })
        return {
          dept: dept.name,
          amount: deptPaid.reduce((sum, p) => sum + (p.amount || 0), 0),
          count: deptPaid.length,
        }
      }).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount)

      const byItem: Record<string, number> = {}
      paid.forEach(p => {
        const item = p.payment_items as { title?: string } | null
        if (item?.title) byItem[item.title] = (byItem[item.title] || 0) + (p.amount || 0)
      })

      return {
        totalRevenue,
        pendingAmount,
        totalPaid: paid.length,
        totalPending: pending.length,
        totalOverdue: overdue.length,
        byDept,
        byItem: Object.entries(byItem).sort((a, b) => b[1] - a[1]),
      }
    },
  })

  const { data: recentPayments } = useQuery({
    queryKey: ['financial-recent'],
    queryFn: async () => {
      const [paymentsRes, deptsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*, profiles:student_id(full_name, department_id), payment_items:payment_item_id(title)')
          .eq('status', 'successful')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('departments').select('id, name'),
      ])
      const deptMap = Object.fromEntries((deptsRes.data || []).map(d => [d.id, d.name]))
      return { payments: paymentsRes.data || [], deptMap }
    },
  })

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue ?? 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Amount', value: formatCurrency(stats?.pendingAmount ?? 0), icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Paid Transactions', value: stats?.totalPaid ?? 0, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Overdue', value: stats?.totalOverdue ?? 0, icon: Users, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Financial Dashboard</h1>
        <p className="text-brand-grey mt-1">Payment summary and revenue breakdown</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-brand-border p-5">
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
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Revenue by Department</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : stats?.byDept.length === 0 ? (
            <p className="text-brand-grey text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.byDept.map(d => (
                <div key={d.dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-text truncate">{d.dept}</span>
                    <span className="text-brand-grey ml-2 shrink-0 font-medium">{formatCurrency(d.amount)}</span>
                  </div>
                  <div className="h-2 bg-brand-pale rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full"
                      style={{ width: `${Math.min(100, (d.amount / (stats.totalRevenue || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-brand-border p-5">
          <h2 className="font-semibold text-brand-text mb-4">Revenue by Item</h2>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : stats?.byItem.length === 0 ? (
            <p className="text-brand-grey text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {stats?.byItem.map(([name, amount]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-brand-text">{name}</span>
                    <span className="text-brand-grey ml-2 font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-2 bg-brand-pale rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-secondary rounded-full"
                      style={{ width: `${Math.min(100, (amount / (stats.totalRevenue || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-brand-border p-5">
        <h2 className="font-semibold text-brand-text mb-4">Recent Paid Transactions</h2>
        {recentPayments?.payments.length === 0 ? (
          <p className="text-brand-grey text-sm">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-grey text-xs">
                  <th className="text-left px-3 py-2 font-medium">Student</th>
                  <th className="text-left px-3 py-2 font-medium">Department</th>
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Amount</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments?.payments.map(p => {
                  const student = p.profiles as { full_name?: string; department_id?: string } | null
                  const item = p.payment_items as { title?: string } | null
                  return (
                    <tr key={p.id} className="border-b border-brand-border last:border-0 hover:bg-brand-pale/30">
                      <td className="px-3 py-2.5 font-medium text-brand-text">{student?.full_name}</td>
                      <td className="px-3 py-2.5 text-brand-grey">{recentPayments.deptMap[student?.department_id ?? ''] || student?.department_id}</td>
                      <td className="px-3 py-2.5 text-brand-text">{item?.title}</td>
                      <td className="px-3 py-2.5 font-medium text-green-700">{formatCurrency(p.amount || 0)}</td>
                      <td className="px-3 py-2.5 text-brand-grey">{formatDateShort(p.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
