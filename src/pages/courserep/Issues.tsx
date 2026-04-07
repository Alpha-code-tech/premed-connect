import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ExternalLink, MessageSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
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

export default function CourseRepIssues() {
  const { profile: currentProfile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<(Issue & { profiles: { full_name: string; email: string } | null }) | null>(null)
  const [feedback, setFeedback] = useState('')

  const { data: issues, isLoading } = useQuery({
    queryKey: ['courserep-issues', currentProfile?.department_id],
    queryFn: async () => {
      // Scope issues to students in this rep's department only (IDOR prevention)
      const { data: deptStudents } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('department_id', currentProfile!.department_id!)
        .eq('role', 'student')
      if (!deptStudents?.length) return []

      const deptStudentIds = deptStudents.map(s => s.id)
      const { data: issuesData, error } = await supabase
        .from('issues')
        .select('*')
        .in('student_id', deptStudentIds)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!issuesData?.length) return []

      const profileMap = Object.fromEntries(deptStudents.map(p => [p.id, p]))
      return issuesData.map(issue => ({
        ...issue,
        profiles: profileMap[issue.student_id] ?? null,
      })) as (Issue & { profiles: { full_name: string; email: string } | null })[]
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
      queryClient.invalidateQueries({ queryKey: ['courserep-issues'] })
      toast({ title: 'Issue updated' })
      setSelected(null)
      setFeedback('')
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.student_id || !feedback.trim()) return
      const senderName = currentProfile?.full_name ?? 'Your representative'
      const { error } = await supabase.from('notifications').insert({
        student_id: selected.student_id,
        title: `Feedback on your "${selected.category}" issue`,
        message: `${senderName}: ${feedback.trim()}`,
        urgency: 'normal',
        is_read: false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Feedback sent', description: 'The student has been notified.' })
      setFeedback('')
    },
    onError: (e: Error) => toast({ title: 'Failed to send feedback', description: e.message, variant: 'destructive' }),
  })

  const handleClose = () => {
    setSelected(null)
    setFeedback('')
  }

  const statusVariant = (s: string) => s === 'resolved' ? 'success' : s === 'in_progress' ? 'warning' : 'danger'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Issues</h1>
        <p className="text-brand-grey mt-1">Manage student issues and requests</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : issues?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <AlertCircle className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No issues submitted yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-brand-pale border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Student</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Category</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Recipient</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Date</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Status</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {issues?.map(issue => {
                const { recipient } = parseDescription(issue.description)
                return (
                  <tr key={issue.id} className="hover:bg-brand-pale/30 transition-colors">
                    <td className="px-4 py-3 text-brand-text font-medium">
                      {issue.profiles?.full_name ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-brand-grey">{issue.category}</td>
                    <td className="px-4 py-3 text-brand-grey">{recipient || '—'}</td>
                    <td className="px-4 py-3 text-brand-grey">{formatDate(issue.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(issue.status) as 'success' | 'warning' | 'danger'}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelected(issue); setFeedback('') }}>
                        View
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
                    <span className="text-brand-grey w-20 shrink-0">Student:</span>
                    <span className="font-medium text-brand-text">{selected?.profiles?.full_name ?? 'Unknown'}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey w-20 shrink-0">Category:</span>
                    <span className="text-brand-text">{selected?.category}</span>
                  </div>
                  {parsed.recipient && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-brand-grey w-20 shrink-0">Sent to:</span>
                      <span className="font-medium text-brand-primary">{parsed.recipient}</span>
                    </div>
                  )}
                  <div className="bg-brand-pale/50 rounded-lg p-3 text-sm text-brand-text leading-relaxed">
                    {parsed.description}
                  </div>
                  {selected?.attachment_url && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const { data } = await supabase.storage.from('issues').createSignedUrl(selected.attachment_url!, 3600)
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                    }}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Attachment
                    </Button>
                  )}
                </div>

                {/* Send feedback */}
                <div className="border-t border-brand-border pt-4">
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-4 w-4 text-brand-primary" />
                    Send Feedback to Student
                  </label>
                  <Textarea
                    className="h-20 resize-none text-sm"
                    placeholder="Type your feedback or response here..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-2 bg-brand-primary hover:bg-brand-secondary"
                    disabled={!feedback.trim() || feedbackMutation.isPending}
                    onClick={() => feedbackMutation.mutate()}
                  >
                    {feedbackMutation.isPending ? 'Sending...' : 'Send Feedback'}
                  </Button>
                </div>

                {/* Update status */}
                <div className="border-t border-brand-border pt-4">
                  <label className="text-sm font-medium">Update Status</label>
                  <Select value={selected?.status} onValueChange={status => {
                    if (selected) setSelected({ ...selected, status: status as Issue['status'] })
                  }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleClose}>Cancel</Button>
                  <Button
                    className="bg-brand-primary hover:bg-brand-secondary"
                    disabled={updateMutation.isPending}
                    onClick={() => selected && updateMutation.mutate({ id: selected.id, status: selected.status as Issue['status'] })}
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
