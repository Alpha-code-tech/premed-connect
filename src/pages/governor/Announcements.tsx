import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Megaphone, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  body: z.string().min(10, 'Body must be at least 10 characters'),
})
type FormData = z.infer<typeof schema>

export default function GovernorAnnouncements() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', body: '' },
  })

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['governor-announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('announcements').insert({
        title: data.title,
        body: data.body,
        sent_by: profile!.id,
        department_id: null, // null = all departments
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governor-announcements'] })
      toast({ title: 'Announcement posted' })
      setOpen(false)
      form.reset()
    },
    onError: (e: Error) => toast({ title: 'Failed to post', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governor-announcements'] })
      toast({ title: 'Announcement deleted' })
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Announcements</h1>
          <p className="text-brand-grey mt-1 text-sm">Broadcast to all departments</p>
        </div>
        <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : announcements?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <Megaphone className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements?.map(a => (
            <div key={a.id} className={`bg-white rounded-lg border p-4 transition-colors ${confirmDeleteId === a.id ? 'border-red-300 bg-red-50' : 'border-brand-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-brand-text">{a.title}</h3>
                    {!a.department_id && <Badge variant="outline" className="text-xs">All Depts</Badge>}
                  </div>
                  <p className="text-sm text-brand-grey line-clamp-2">{a.body}</p>
                  <p className="text-xs text-brand-grey mt-2">{formatDate(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeleteId === a.id ? (
                    <>
                      <span className="text-xs text-red-600 font-medium mr-1">Delete this?</span>
                      <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                        onClick={() => { deleteMutation.mutate(a.id); setConfirmDeleteId(null) }}
                        disabled={deleteMutation.isPending}>
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      onClick={() => setConfirmDeleteId(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="Announcement title..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl><Textarea className="h-32 resize-none" placeholder="Write your announcement..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <p className="text-xs text-brand-grey">This will be visible to all departments.</p>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
