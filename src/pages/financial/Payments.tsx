import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Search, Download, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export default function FinancialPayments() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25
  const [createOpen, setCreateOpen] = useState(false)
  const [billForm, setBillForm] = useState({ title: '', amount: '', deadline: '', scope: 'all', department_id: '' })
  const [saving, setSaving] = useState(false)
  const [confirmDeleteBillId, setConfirmDeleteBillId] = useState<string | null>(null)

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-bills'] })
      queryClient.invalidateQueries({ queryKey: ['financial-all-payments'] })
      setConfirmDeleteBillId(null)
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
  })

  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ['financial-bills'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_items')
        .select('*, profiles:created_by(full_name, role)')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: allPayments, isLoading } = useQuery({
    queryKey: ['financial-all-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, profiles:student_id(full_name, email, student_id, department_id), payment_items:payment_item_id(title, amount)')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const deptMap = Object.fromEntries((departments || []).map(d => [d.id, d.name]))

  const handleCreateBill = async () => {
    if (!billForm.title || !billForm.amount || !billForm.deadline) {
      toast({ title: 'All fields are required', variant: 'destructive' })
      return
    }
    if (billForm.scope === 'department' && !billForm.department_id) {
      toast({ title: 'Please select a department', variant: 'destructive' })
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
      department_id: billForm.scope === 'all' ? null : billForm.department_id,
      created_by: profile!.id,
    })
    setSaving(false)
    if (error) {
      toast({ title: 'Failed to create bill', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Bill created successfully' })
    queryClient.invalidateQueries({ queryKey: ['financial-bills'] })
    setCreateOpen(false)
    setBillForm({ title: '', amount: '', deadline: '', scope: 'all', department_id: '' })
  }

  const filtered = allPayments?.filter(p => {
    const student = p.profiles as { full_name?: string; email?: string; student_id?: string; department_id?: string } | null
    const matchSearch = !search ||
      student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      student?.student_id?.toLowerCase().includes(search.toLowerCase()) ||
      student?.email?.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'all' || student?.department_id === deptFilter
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchDept && matchStatus
  }) ?? []

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalRevenue = filtered.filter(p => p.status === 'successful').reduce((sum, p) => sum + (p.amount || 0), 0)

  const exportCSV = () => {
    if (!filtered.length) return
    const rows = [
      ['Name', 'Student ID', 'Email', 'Department', 'Item', 'Amount', 'Status', 'Reference', 'Date'],
      ...filtered.map(p => {
        const s = p.profiles as { full_name?: string; student_id?: string; email?: string; department_id?: string } | null
        const item = p.payment_items as { title?: string } | null
        return [
          s?.full_name || '',
          s?.student_id || '',
          s?.email || '',
          deptMap[s?.department_id ?? ''] || s?.department_id || '',
          item?.title || '',
          p.amount?.toString() || '',
          p.status,
          p.paystack_reference || '',
          formatDateShort(p.created_at),
        ]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `financial-payments-${Date.now()}.csv`
    a.click()
  }

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'outline' => {
    if (s === 'successful') return 'success'
    if (s === 'pending') return 'warning'
    if (s === 'failed') return 'danger'
    return 'outline'
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Bills Management */}
      <div className="bg-white rounded-lg border border-brand-border p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-text">Payment Bills</h2>
            <p className="text-sm text-brand-grey mt-0.5">Manage bills for the entire PreMed group</p>
          </div>
          <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Bill
          </Button>
        </div>
        {billsLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : bills?.length === 0 ? (
          <p className="text-sm text-brand-grey text-center py-4">No bills created yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bills?.map(bill => {
              const creator = bill.profiles as { full_name?: string } | null
              return (
                <div key={bill.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${confirmDeleteBillId === bill.id ? 'bg-red-50 border-red-300' : 'bg-brand-pale/40 border-brand-border'}`}>
                  <div>
                    <p className="text-sm font-medium text-brand-text">{bill.title}</p>
                    <p className="text-xs text-brand-grey">
                      {formatCurrency(bill.amount)} · Deadline: {formatDateShort(bill.deadline)} · {bill.department_id ? (deptMap[bill.department_id] || bill.department_id) : 'All Departments'}
                    </p>
                    {creator?.full_name && (
                      <p className="text-xs text-brand-grey">by {creator.full_name}</p>
                    )}
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
              )
            })}
          </div>
        )}
      </div>

      {/* Payment Records */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Payment Records</h1>
          <p className="text-brand-grey mt-1 text-sm">Complete payment history</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="w-full sm:w-auto gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <p className="text-xs text-brand-grey">Filtered Revenue</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <p className="text-xs text-brand-grey">Total Records</p>
          <p className="text-xl font-bold text-brand-text mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <p className="text-xs text-brand-grey">Paid</p>
          <p className="text-xl font-bold text-green-600 mt-1">{filtered.filter(p => p.status === 'successful').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <p className="text-xs text-brand-grey">Pending / Overdue</p>
          <p className="text-xl font-bold text-yellow-600 mt-1">
            {filtered.filter(p => p.status === 'pending' || p.status === 'failed').length}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
          <Input
            placeholder="Search by name, student ID or email..."
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(0) }}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0) }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="successful">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : paginated.length === 0 ? (
        <div className="p-8 text-center text-brand-grey text-sm bg-white rounded-lg border border-brand-border">No payment records found</div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="block md:hidden space-y-3">
            {paginated.map(p => {
              const student = p.profiles as { full_name?: string; student_id?: string; department_id?: string } | null
              const item = p.payment_items as { title?: string } | null
              return (
                <div key={p.id} className="bg-white border border-brand-border rounded-lg p-4 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-sm text-brand-text">{student?.full_name}</p>
                      {student?.student_id && <p className="text-xs text-brand-grey">{student.student_id}</p>}
                    </div>
                    <Badge variant={statusVariant(p.status)} className="shrink-0">{p.status}</Badge>
                  </div>
                  <p className="text-xs text-brand-grey">{deptMap[student?.department_id ?? ''] || student?.department_id || '—'}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-brand-grey truncate mr-2">{item?.title}</span>
                    <span className="font-semibold text-brand-text shrink-0">{formatCurrency(p.amount || 0)}</span>
                  </div>
                  {p.paystack_reference && <p className="text-xs font-mono text-brand-grey truncate">{p.paystack_reference}</p>}
                  <p className="text-xs text-brand-grey">{formatDateShort(p.created_at)}</p>
                </div>
              )
            })}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-lg border border-brand-border overflow-x-auto max-w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-grey text-xs bg-brand-pale/30">
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium">Item</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => {
                  const student = p.profiles as { full_name?: string; student_id?: string; department_id?: string } | null
                  const item = p.payment_items as { title?: string } | null
                  return (
                    <tr key={p.id} className="border-b border-brand-border last:border-0 hover:bg-brand-pale/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-text">{student?.full_name}</p>
                        <p className="text-xs text-brand-grey">{student?.student_id}</p>
                      </td>
                      <td className="px-4 py-3 text-brand-grey text-xs">{deptMap[student?.department_id ?? ''] || student?.department_id}</td>
                      <td className="px-4 py-3 text-brand-text">{item?.title}</td>
                      <td className="px-4 py-3 font-semibold text-brand-text">{formatCurrency(p.amount || 0)}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(p.status)}>{p.status}</Badge></td>
                      <td className="px-4 py-3 text-brand-grey text-xs font-mono max-w-[120px] truncate">{p.paystack_reference || '—'}</td>
                      <td className="px-4 py-3 text-brand-grey text-xs">{formatDateShort(p.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border bg-white rounded-b-lg">
              <p className="text-xs text-brand-grey">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Bill Dialog */}
      <Dialog open={createOpen} onOpenChange={open => {
        setCreateOpen(open)
        if (!open) setBillForm({ title: '', amount: '', deadline: '', scope: 'all', department_id: '' })
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bill Title *</label>
              <Input className="mt-1" placeholder="e.g. Association Dues 2024/2025" value={billForm.title} onChange={e => setBillForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (₦) *</label>
              <Input className="mt-1" type="number" min="1" placeholder="e.g. 10000" value={billForm.amount} onChange={e => setBillForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Payment Deadline *</label>
              <Input className="mt-1" type="date" value={billForm.deadline} onChange={e => setBillForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Scope</label>
              <Select value={billForm.scope} onValueChange={v => setBillForm(p => ({ ...p, scope: v, department_id: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments (Entire PreMed Group)</SelectItem>
                  <SelectItem value="department">Specific Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {billForm.scope === 'department' && (
              <div>
                <label className="text-sm font-medium">Department *</label>
                <Select value={billForm.department_id} onValueChange={v => setBillForm(p => ({ ...p, department_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {(departments || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {billForm.scope === 'all' && (
              <div className="p-3 rounded-lg bg-brand-pale/60 text-xs text-brand-grey">
                This bill will be visible to all students. Receipt notifications go to all Governors and Financial Secretaries.
              </div>
            )}
            {billForm.scope === 'department' && (
              <div className="p-3 rounded-lg bg-brand-pale/60 text-xs text-brand-grey">
                This bill is visible only to students in the selected department. Receipt notifications go to the Course Rep and Assistant Course Rep of that department.
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" onClick={handleCreateBill} disabled={saving}>
              {saving ? 'Creating...' : 'Create Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
