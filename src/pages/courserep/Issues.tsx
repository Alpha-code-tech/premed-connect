import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<(Issue & { profiles: { full_name: string } | null }) | null>(null)

  const { data: issues, isLoading } = useQuery({
    queryKey: ['courserep-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as (Issue & { profiles: { full_name: string } | null })[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Issue['status'] }) => {
      const { error } = await supabase.from('issues').update({ status }).eq('id', id)
      if (error) throw error

      // Notify student
      if (selected?.student_id) {
        await supabase.from('notifications').insert({
          student_id: selected.student_id,
          title: 'Issue Status Updated',
          message: `Your issue has been updated to: ${status}`,
          urgency: 'normal',
          is_read: false,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courserep-issues'] })
      toast({ title: 'Issue updated' })
      setSelected(null)
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

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
                  <td className="px-4 py-3 text-brand-text font-medium">{issue.profiles?.full_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-brand-grey">{issue.category}</td>
                  <td className="px-4 py-3 text-brand-grey">{recipient || '—'}</td>
                  <td className="px-4 py-3 text-brand-grey">{formatDate(issue.created_at)}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(issue.status) as 'success' | 'warning' | 'danger'}>{issue.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelected(issue)}>
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

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.category} Issue</DialogTitle>
          </DialogHeader>
          {(() => {
            const parsed = selected ? parseDescription(selected.description) : { recipient: null, description: '' }
            return (
              <>
                <div className="space-y-3">
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey">Student:</span>
                    <span className="font-medium">{selected?.profiles?.full_name}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-brand-grey">Category:</span>
                    <span>{selected?.category}</span>
                  </div>
                  {parsed.recipient && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-brand-grey">Recipient:</span>
                      <span className="font-medium text-brand-primary">{parsed.recipient}</span>
                    </div>
                  )}
                  <div className="bg-brand-pale/50 rounded-lg p-3 text-sm">{parsed.description}</div>
                  {selected?.attachment_url && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const { data } = await supabase.storage.from('issues').createSignedUrl(selected.attachment_url!, 3600)
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                    }}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Attachment
                    </Button>
                  )}
                  <div>
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
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button className="bg-brand-primary hover:bg-brand-secondary" disabled={updateMutation.isPending}
                    onClick={() => selected && updateMutation.mutate({ id: selected.id, status: selected.status as Issue['status'] })}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
