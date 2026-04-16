import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ExternalLink, MessageSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { ISSUE_CATEGORIES } from '@/lib/constants'
import type { Issue } from '@/types'

const RECIPIENT_PREFIX = 'To: '
const RECIPIENT_SEPARATOR = '\n---\n'

function parseDescription(raw: string): { recipient: string | null; description: string } {
  if (raw.startsWith(RECIPIENT_PREFIX) && raw.includes(RECIPIENT_SEPARATOR)) {
    const sep = raw.indexOf(RECIPIENT_SEPARATOR)
    const recipient = raw.slice(RECIPIENT_PREFIX.length, sep)
    const description = raw.slice(sep + RECIPIENT_SEPARATOR.length)
    return { recipient, description }
  }
  return { recipient: null, description: raw }
}

type IssueWithProfile = Issue & {
  profiles: { full_name: string; email: string; department_id: string | null } | null
}

export default function GovernorIssues() {
  const { profile: currentProfile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<IssueWithProfile | null>(null)
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['governor-issues'],
    queryFn: async () => {
      const [issuesRes, profilesRes, deptsRes] = await Promise.all([
        supabase.from('issues').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, department_id').eq('role', 'student'),
        supabase.from('departments').select('id, name').order('name'),
      ])

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p]))
      const departments = deptsRes.data || []

      const governorIssues = (issuesRes.data || [])
        .map(issue => ({
          ...issue,
          profiles: profileMap[issue.student_id] ?? null,
        }))
        .filter(issue => {
          const { recipient } = parseDescription(issue.description)
          return recipient === 'Governor'
        }) as IssueWithProfile[]

      return { issues: governorIssues, departments }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Issue['status'] }) => {
      const { error } = await supabase.from('issues').update({ status }).eq('id', id)
      if (error) throw error
      if (selected?.student_id) {
        await supabase.from('notifications').insert({
          student_id: selected.student_id,
          title: 'Issue Status Updated',
          message: `Your issue "${selected.category}" has been updated to: ${status.replace('_', ' ')}`,
          urgency: 'normal',
          is_read: false,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governor-issues'] })
      toast({ title: 'Issue updated' })
      setSelected(null)
      setFeedback('')
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.student_id || !feedback.trim()) return
      const senderName = currentProfile?.full_name ?? 'The Governor'
      const { error } = await supabase.from('notifications').insert({
        student_id: selected.student_id,
        title: `Response on your "${selected.category}" issue`,
        message: `${senderName}: ${feedback.trim()}`,
        urgency: 'normal',
        is_read: false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Response sent', description: 'The student has been notified.' })
      setFeedback('')
    },
    onError: (e: Error) => toast({ title: 'Failed to send response', description: e.message, variant: 'destructive' }),
  })

  const handleClose = () => { setSelected(null); setFeedback('') }

  const deptMap = Object.fromEntries((data?.departments || []).map(d => [d.id, d.name]))

  const statusBadgeVariant = (s: string) =>
    s === 'resolved' ? 'success' : s === 'in_progress' ? 'warning' : 'danger'

  const filtered = (data?.issues || []).filter(issue => {
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false
    if (filterCategory !== 'all' && issue.category !== filterCategory) return false
    if (filterDept !== 'all' && issue.profiles?.department_id !== filterDept) return false
    if (search.trim()) {
      const name = issue.profiles?.full_name?.toLowerCase() ?? ''
      if (!name.includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Issues</h1>
        <p className="text-brand-grey mt-1 text-sm">Issues submitted directly to the Governor</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:w-56"
        />
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {data?.departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ISSUE_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <AlertCircle className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">
            {(data?.issues.length ?? 0) === 0
              ? 'No issues directed to the Governor yet'
              : 'No results match your filters'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="block md:hidden space-y-3">
            {filtered.map(issue => (
              <div key={issue.id} className="bg-white border border-brand-border rounded-lg p-4 space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <p className="font-semibold text-sm text-brand-text">{issue.profiles?.full_name ?? 'Unknown'}</p>
                  <Badge variant={statusBadgeVariant(issue.status) as 'success' | 'warning' | 'danger'} className="shrink-0">
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-brand-grey">{deptMap[issue.profiles?.department_id ?? ''] || '—'}</p>
                <p className="text-xs text-brand-grey">{issue.category} · {formatDate(issue.created_at)}</p>
                <Button size="sm" variant="outline" className="h-8 text-xs w-full mt-1"
                  onClick={() => { setSelected(issue); setFeedback('') }}>
                  View Issue
                </Button>
              </div>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white rounded-lg border border-brand-border overflow-x-auto max-w-full">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-brand-pale border-b border-brand-border">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Department</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Category</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map(issue => (
                  <tr key={issue.id} className="hover:bg-brand-pale/30 transition-colors">
                    <td className="px-4 py-3 text-brand-text font-medium">{issue.profiles?.full_name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-brand-grey">{deptMap[issue.profiles?.department_id ?? ''] || '—'}</td>
                    <td className="px-4 py-3 text-brand-grey">{issue.category}</td>
                    <td className="px-4 py-3 text-brand-grey">{formatDate(issue.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(issue.status) as 'success' | 'warning' | 'danger'}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setSelected(issue); setFeedback('') }}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.category} Issue</DialogTitle>
          </DialogHeader>
          {(() => {
            const parsed = selected ? parseDescription(selected.description) : { recipient: null, description: '' }
            return (
              <div className="space-y-4">
                {/* Issue details */}
                <div className="space-y-2">
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey w-24 shrink-0">Student:</span>
                    <span className="font-medium text-brand-text">{selected?.profiles?.full_name ?? 'Unknown'}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey w-24 shrink-0">Department:</span>
                    <span className="text-brand-text">{deptMap[selected?.profiles?.department_id ?? ''] || '—'}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey w-24 shrink-0">Category:</span>
                    <span className="text-brand-text">{selected?.category}</span>
                  </div>
                  <div className="bg-brand-pale/50 rounded-lg p-3 text-sm text-brand-text leading-relaxed">
                    {parsed.description}
                  </div>
                  {selected?.attachment_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { data } = await supabase.storage
                          .from('issues')
                          .createSignedUrl(selected.attachment_url!, 3600)
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Attachment
                    </Button>
                  )}
                </div>

                {/* Send response */}
                <div className="border-t border-brand-border pt-4">
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-4 w-4 text-brand-primary" />
                    Send Response to Student
                  </label>
                  <Textarea
                    className="h-20 resize-none text-sm"
                    placeholder="Type your response here..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-2 bg-brand-primary hover:bg-brand-secondary"
                    disabled={!feedback.trim() || feedbackMutation.isPending}
                    onClick={() => feedbackMutation.mutate()}
                  >
                    {feedbackMutation.isPending ? 'Sending...' : 'Send Response'}
                  </Button>
                </div>

                {/* Update status */}
                <div className="border-t border-brand-border pt-4">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select
                    value={selected?.status}
                    onValueChange={status => {
                      if (selected) setSelected({ ...selected, status: status as Issue['status'] })
                    }}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button
                    className="bg-brand-primary hover:bg-brand-secondary"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      selected && updateMutation.mutate({ id: selected.id, status: selected.status as Issue['status'] })
                    }
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
