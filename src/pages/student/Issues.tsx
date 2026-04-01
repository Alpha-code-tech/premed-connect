import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, AlertCircle, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDateShort } from '@/lib/utils'
import { ISSUE_CATEGORIES } from '@/lib/constants'

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

const RECIPIENTS = [
  { value: 'Course Rep', label: 'Course Rep (My Department)' },
  { value: 'Assistant Course Rep', label: 'Assistant Course Rep (My Department)' },
  { value: 'Governor', label: 'Governor' },
  { value: 'Deputy Governor', label: 'Deputy Governor' },
  { value: 'Financial Secretary', label: 'Financial Secretary' },
] as const

const RECIPIENT_PREFIX = 'To: '
const RECIPIENT_SEPARATOR = '\n---\n'

function encodeDescription(recipient: string, description: string) {
  return `${RECIPIENT_PREFIX}${recipient}${RECIPIENT_SEPARATOR}${description}`
}

function parseDescription(raw: string): { recipient: string | null; description: string } {
  if (raw.startsWith(RECIPIENT_PREFIX) && raw.includes(RECIPIENT_SEPARATOR)) {
    const sep = raw.indexOf(RECIPIENT_SEPARATOR)
    const recipient = raw.slice(RECIPIENT_PREFIX.length, sep)
    const description = raw.slice(sep + RECIPIENT_SEPARATOR.length)
    return { recipient, description }
  }
  return { recipient: null, description: raw }
}

const issueSchema = z.object({
  recipient: z.string().min(1, 'Please select a recipient'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
})

type IssueForm = z.infer<typeof issueSchema>

export default function StudentIssues() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('issues').delete().eq('id', id).eq('student_id', profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-issues'] })
      setConfirmDeleteId(null)
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  const form = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
    defaultValues: { recipient: '', category: '', description: '' },
  })

  const { data: issues, isLoading } = useQuery({
    queryKey: ['student-issues', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('issues')
        .select('*')
        .eq('student_id', profile!.id)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Allowed: PDF, PNG, JPG', variant: 'destructive' })
      return
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast({ title: 'File too large', description: 'Maximum 5MB', variant: 'destructive' })
      return
    }
    setAttachmentFile(file)
  }

  const submitMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      setUploading(true)
      let attachmentUrl: string | null = null

      if (attachmentFile) {
        const ext = attachmentFile.name.split('.').pop()
        const path = `issues/${profile!.id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('issues').upload(path, attachmentFile)
        if (uploadError) throw uploadError
        attachmentUrl = path
      }

      const { error } = await supabase.from('issues').insert({
        student_id: profile!.id,
        category: data.category,
        description: encodeDescription(data.recipient, data.description),
        attachment_url: attachmentUrl,
        status: 'open',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-issues'] })
      toast({ title: 'Issue submitted successfully' })
      setOpen(false)
      setAttachmentFile(null)
      form.reset()
      setUploading(false)
    },
    onError: (e: Error) => {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' })
      setUploading(false)
    },
  })

  const statusVariant = (s: string): 'warning' | 'success' | 'outline' => {
    if (s === 'open') return 'warning'
    if (s === 'resolved') return 'success'
    return 'outline'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Issues</h1>
          <p className="text-brand-grey mt-1">Submit and track your issues</p>
        </div>
        <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Submit Issue
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : issues?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <AlertCircle className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No issues submitted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues?.map(issue => {
            const { recipient, description } = parseDescription(issue.description)
            const canDelete = issue.status === 'open'
            return (
              <div key={issue.id} className={`rounded-lg border p-4 transition-colors ${confirmDeleteId === issue.id ? 'border-red-300 bg-red-50' : 'bg-white border-brand-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant(issue.status)}>{issue.status.replace('_', ' ')}</Badge>
                      <span className="text-xs text-brand-grey">{issue.category}</span>
                      {recipient && (
                        <span className="text-xs text-brand-primary font-medium">→ {recipient}</span>
                      )}
                    </div>
                    <p className="text-sm text-brand-grey mt-1 line-clamp-2">{description}</p>
                    <p className="text-xs text-brand-grey mt-1">{formatDateShort(issue.created_at)}</p>
                  </div>
                  {canDelete && (
                    <div className="flex items-center gap-1 shrink-0">
                      {confirmDeleteId === issue.id ? (
                        <>
                          <span className="text-xs text-red-600 font-medium mr-1">Withdraw?</span>
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                            onClick={() => deleteMutation.mutate(issue.id)}
                            disabled={deleteMutation.isPending}>
                            Yes
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                          title="Withdraw issue"
                          onClick={() => setConfirmDeleteId(issue.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={open => { setOpen(open); if (!open) { form.reset(); setAttachmentFile(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit an Issue</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => submitMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="recipient" render={({ field }) => (
                <FormItem>
                  <FormLabel>Send To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RECIPIENTS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (min 20 chars)</FormLabel>
                  <FormControl><Textarea className="h-28 resize-none" placeholder="Describe your issue in detail..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                <label className="text-sm font-medium">Attachment (optional, max 5MB — PDF/PNG/JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="mt-1 block w-full text-sm text-brand-grey file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-brand-border file:text-xs file:bg-brand-pale file:text-brand-primary cursor-pointer"
                  onChange={handleFileSelect}
                />
                {attachmentFile && <p className="text-xs text-brand-grey mt-1">{attachmentFile.name}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-primary hover:bg-brand-secondary" disabled={submitMutation.isPending || uploading}>
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Issue'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
