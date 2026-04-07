import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Check, X, Download, Copy, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { generatePassword, formatDateShort } from '@/lib/utils'
import { sanitizeCsvCell } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ROLES } from '@/lib/constants'

type RequestStatus = 'pending' | 'approved' | 'rejected'

interface AccessRequest {
  id: string
  full_name: string
  department_id: string
  matriculation_number: string
  gmail: string
  submitted_at: string
  status: RequestStatus
  rejection_reason: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

interface ApprovedCredentials {
  password: string
  email: string
}

type StatusVariant = 'success' | 'warning' | 'danger'

function statusVariant(status: RequestStatus): StatusVariant {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

async function invokeFn(name: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
  const { error } = await supabase.functions.invoke(name, {
    body,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    signal: controller.signal,
  })
  if (error) {
    let message = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const b = await error.context.json()
        message = b.error || message
      } catch { /* ignore */ }
    }
    throw new Error(message)
  }
  } finally {
    clearTimeout(timeout)
  }
}

export default function DeveloperAccessRequests() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<string>('pending')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvedPassword, setApprovedPassword] = useState<ApprovedCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
  })

  const { data: requests, isLoading } = useQuery<AccessRequest[]>({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AccessRequest[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({
      requestId,
      email,
      fullName,
      departmentId,
      matricNumber,
    }: {
      requestId: string
      email: string
      fullName: string
      departmentId: string
      matricNumber: string
    }): Promise<ApprovedCredentials> => {
      const password = generatePassword()

      await invokeFn('create-user', {
        email,
        password,
        full_name: fullName,
        department_id: departmentId,
        student_id: matricNumber,
        role: ROLES.STUDENT,
      })

      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', requestId)

      if (updateError) throw new Error(updateError.message)

      await supabase.from('audit_log').insert({
        action_type: 'access_request_approved',
        performed_by: profile!.id,
        affected_entity_type: 'access_request',
        affected_entity_id: requestId,
        metadata: { email, full_name: fullName },
      })

      return { password, email }
    },
    onSuccess: (data) => {
      setApprovedPassword(data)
      setApprovingId(null)
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
      queryClient.invalidateQueries({ queryKey: ['developer-stats'] })
      toast({ title: 'Access granted', description: 'User account created successfully.' })
    },
    onError: (e: Error) => {
      setApprovingId(null)
      toast({ title: 'Approval failed', description: e.message, variant: 'destructive' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', requestId)

      if (error) throw new Error(error.message)

      await supabase.from('audit_log').insert({
        action_type: 'access_request_rejected',
        performed_by: profile!.id,
        affected_entity_type: 'access_request',
        affected_entity_id: requestId,
        metadata: { reason },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
      queryClient.invalidateQueries({ queryKey: ['developer-stats'] })
      setRejectTarget(null)
      setRejectReason('')
      toast({ title: 'Request rejected' })
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const exportCSV = () => {
    const rows = filtered.map((r) => [
      sanitizeCsvCell(r.full_name),
      sanitizeCsvCell(deptMap[r.department_id] || r.department_id),
      sanitizeCsvCell(r.matriculation_number),
      sanitizeCsvCell(r.gmail),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(formatDateShort(r.submitted_at)),
    ].map(cell => `"${cell}"`).join(','))
    const csv = 'Full Name,Department,Matric Number,Gmail,Status,Date\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'access_requests.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const deptMap = Object.fromEntries((departments || []).map(d => [d.id, d.name]))

  const allRequests = requests ?? []

  const filtered = allRequests.filter((r) => {
    const matchTab = tab === 'all' || r.status === tab
    const term = search.toLowerCase()
    const matchSearch =
      !search ||
      r.full_name.toLowerCase().includes(term) ||
      r.matriculation_number.toLowerCase().includes(term) ||
      r.department_id.toLowerCase().includes(term)
    return matchTab && matchSearch
  })

  const pendingCount = allRequests.filter((r) => r.status === 'pending').length

  const handleApprove = (req: AccessRequest) => {
    setApprovingId(req.id)
    approveMutation.mutate({
      requestId: req.id,
      email: req.gmail,
      fullName: req.full_name,
      departmentId: req.department_id,
      matricNumber: req.matriculation_number,
    })
  }

  const handlePasswordDialogClose = () => {
    setApprovedPassword(null)
    setShowPassword(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Access Requests</h1>
          <p className="text-brand-grey mt-1">Review and approve student access requests</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
        <Input
          className="pl-9"
          placeholder="Search by name, matric number, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-brand-border mt-4">
              <p className="text-brand-grey">
                No {tab !== 'all' ? tab : ''} requests found
              </p>
            </div>
          ) : (
            <div className="mt-4 bg-white rounded-lg border border-brand-border overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-brand-pale border-b border-brand-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Full Name</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Department</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Matric No.</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Gmail</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-brand-grey font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filtered.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-brand-pale/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-brand-text">{req.full_name}</td>
                      <td className="px-4 py-3 text-brand-grey">{deptMap[req.department_id] || req.department_id}</td>
                      <td className="px-4 py-3 text-brand-grey">{req.matriculation_number}</td>
                      <td className="px-4 py-3 text-brand-grey">{req.gmail}</td>
                      <td className="px-4 py-3 text-brand-grey whitespace-nowrap">
                        {formatDateShort(req.submitted_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(req.status)} className="capitalize">
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-brand-primary hover:bg-brand-secondary h-7 text-xs"
                              disabled={approvingId === req.id || approveMutation.isPending}
                              onClick={() => handleApprove(req)}
                            >
                              {approvingId === req.id ? (
                                <span className="px-1">...</span>
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => setRejectTarget(req.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {req.status === 'rejected' && req.rejection_reason && (
                          <span className="text-xs text-brand-grey italic">
                            {req.rejection_reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Password reveal modal */}
      <Dialog open={!!approvedPassword} onOpenChange={handlePasswordDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Created</DialogTitle>
            <DialogDescription>
              Share these credentials with the student. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-brand-grey mb-1">Email</p>
              <p className="font-medium text-brand-text">{approvedPassword?.email}</p>
            </div>
            <div>
              <p className="text-xs text-brand-grey mb-1">Temporary Password</p>
              <div className="flex items-center gap-2">
                <code
                  className={`flex-1 bg-brand-pale border border-brand-border rounded px-3 py-2 text-sm font-mono transition-all select-none ${
                    showPassword ? '' : 'blur-sm'
                  }`}
                >
                  {approvedPassword?.password}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy password"
                  onClick={() => {
                    navigator.clipboard.writeText(approvedPassword?.password ?? '')
                    toast({ title: 'Password copied to clipboard' })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
              This password will not be shown again. The student will be prompted to change
              it on first login.
            </div>
          </div>
          <DialogFooter>
            <Button
              className="bg-brand-primary hover:bg-brand-secondary"
              onClick={handlePasswordDialogClose}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for the rejection.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            className="h-24 resize-none"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget) {
                  rejectMutation.mutate({
                    requestId: rejectTarget,
                    reason: rejectReason,
                  })
                }
              }}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
