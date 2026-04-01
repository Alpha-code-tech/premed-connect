import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Download, CreditCard, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export default function CourseRepPayments() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [billForm, setBillForm] = useState({ title: '', amount: '', deadline: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDeleteBillId, setConfirmDeleteBillId] = useState<string | null>(null)

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courserep-bills'] })
      queryClient.invalidateQueries({ queryKey: ['courserep-payments'] })
      setConfirmDeleteBillId(null)
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  // Payment items (bills) for this department
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['courserep-bills', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_items')
        .select('*')
        .eq('department_id', profile!.department_id!)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Cross-matrix data
  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['courserep-payments', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const [{ data: students }, { data: items }, { data: payments }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, student_id').eq('department_id', profile!.department_id!).eq('role', 'student').order('full_name'),
        supabase.from('payment_items').select('*').or(`department_id.is.null,department_id.eq.${profile!.department_id!}`).order('deadline'),
        supabase.from('payments').select('student_id, payment_item_id, status'),
      ])
      const paymentMap = new Map<string, string>()
      payments?.forEach(p => paymentMap.set(`${p.student_id}-${p.payment_item_id}`, p.status))
      return { students: students || [], items: items || [], paymentMap }
    },
  })

  const handleCreateBill = async () => {
    if (!billForm.title || !billForm.amount || !billForm.deadline) {
      toast({ title: 'All fields are required', variant: 'destructive' })
      return
    }
    const amount = parseFloat(billForm.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('payment_items').insert({
      title: billForm.title,
      amount,
      deadline: billForm.deadline,
      department_id: profile!.department_id,   // locked to their dept
      created_by: profile!.id,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Failed to create bill', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Bill created successfully' })
    queryClient.invalidateQueries({ queryKey: ['courserep-bills'] })
    queryClient.invalidateQueries({ queryKey: ['courserep-payments'] })
    setCreateOpen(false)
    setBillForm({ title: '', amount: '', deadline: '' })
  }

  const exportCSV = () => {
    if (!matrix) return
    const rows: string[] = ['Student,Matric No,' + matrix.items.map(i => i.title).join(',')]
    matrix.students.forEach(s => {
      const row = [s.full_name, s.student_id || ''].concat(
        matrix.items.map(item => matrix.paymentMap.get(`${s.id}-${item.id}`) || 'unpaid')
      )
      rows.push(row.map(c => `"${c}"`).join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'payments.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const statusColor = (status: string | undefined) => {
    if (status === 'successful') return 'bg-green-50 text-green-700 border-green-200'
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Bills Management */}
      <div className="bg-white rounded-lg border border-brand-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-text">Department Bills</h2>
            <p className="text-sm text-brand-grey mt-0.5">Bills generated for your department only</p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Bill
          </Button>
        </div>

        {billsLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : bills?.length === 0 ? (
          <p className="text-sm text-brand-grey text-center py-4">No bills created yet</p>
        ) : (
          <div className="space-y-2">
            {bills?.map(bill => (
              <div key={bill.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${confirmDeleteBillId === bill.id ? 'bg-red-50 border-red-300' : 'bg-brand-pale/40 border-brand-border'}`}>
                <div>
                  <p className="text-sm font-medium text-brand-text">{bill.title}</p>
                  <p className="text-xs text-brand-grey">{formatCurrency(bill.amount)} · Deadline: {formatDateShort(bill.deadline)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeleteBillId === bill.id ? (
                    <>
                      <span className="text-xs text-red-600 font-medium mr-1">Delete bill?</span>
                      <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                        onClick={() => deleteBillMutation.mutate(bill.id)}
                        disabled={deleteBillMutation.isPending}>
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteBillId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="success" className="text-xs">Active</Badge>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 ml-1"
                        onClick={() => setConfirmDeleteBillId(bill.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Matrix */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Payments Overview</h1>
          <p className="text-brand-grey mt-1">Department payment status matrix</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      {matrixLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="bg-white rounded-lg border border-brand-border overflow-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="bg-brand-pale border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-brand-grey font-medium sticky left-0 bg-brand-pale z-10">Student</th>
                {matrix?.items.map(item => (
                  <th key={item.id} className="px-3 py-3 text-brand-grey font-medium text-center min-w-28">
                    <div className="truncate max-w-24">{item.title}</div>
                    <div className="font-normal text-brand-grey">{formatCurrency(item.amount)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {matrix?.students.map(student => (
                <tr key={student.id} className="hover:bg-brand-pale/20">
                  <td className="px-4 py-2 font-medium text-brand-text sticky left-0 bg-white">{student.full_name}</td>
                  {matrix.items.map(item => {
                    const status = matrix.paymentMap.get(`${student.id}-${item.id}`)
                    return (
                      <td key={item.id} className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs border font-medium ${statusColor(status)}`}>
                          {status === 'successful' ? 'Paid' : status === 'pending' ? 'Pending' : 'Unpaid'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {matrix?.students.length === 0 && (
            <div className="text-center py-8 text-brand-grey">No students in your department</div>
          )}
        </div>
      )}

      {/* Create Bill Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setBillForm({ title: '', amount: '', deadline: '' }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Department Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-brand-pale/60 text-xs text-brand-grey">
              This bill will be assigned to your department only and visible to your students.
            </div>
            <div>
              <label className="text-sm font-medium">Bill Title *</label>
              <Input className="mt-1" placeholder="e.g. Association Dues" value={billForm.title} onChange={e => setBillForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (₦) *</label>
              <Input className="mt-1" type="number" min="1" placeholder="e.g. 5000" value={billForm.amount} onChange={e => setBillForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Deadline *</label>
              <Input className="mt-1" type="date" value={billForm.deadline} onChange={e => setBillForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={handleCreateBill} disabled={saving}>
              {saving ? 'Creating...' : 'Create Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
