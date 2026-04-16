// Course rep can compose and send announcements to their department
// List of existing announcements with title, date

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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  body: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message cannot exceed 5000 characters'),
})
type AnnouncementForm = z.infer<typeof announcementSchema>

export default function CourseRepAnnouncements() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const form = useForm<AnnouncementForm>({ resolver: zodResolver(announcementSchema), defaultValues: { title: '', body: '' } })

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['courserep-announcements', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from('announcements').select('*').eq('department_id', profile!.department_id!).order('created_at', { ascending: false })
      return data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courserep-announcements'] }),
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      const { error } = await supabase.from('announcements').insert({
        title: data.title,
        body: data.body,
        department_id: profile!.department_id,
        sent_by: profile!.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courserep-announcements'] })
      toast({ title: 'Announcement sent' })
      setOpen(false)
      form.reset()
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Announcements</h1>
          <p className="text-brand-grey mt-1 text-sm">Send announcements to your department students</p>
        </div>
        <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : announcements?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <Megaphone className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements?.map(ann => (
            <div key={ann.id} className={`rounded-lg border p-4 transition-colors ${confirmDeleteId === ann.id ? 'border-red-300 bg-red-50' : 'bg-white border-brand-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-text">{ann.title}</h3>
                  <p className="text-sm text-brand-grey mt-1">{ann.body}</p>
                  <p className="text-xs text-brand-grey mt-2">{formatDate(ann.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeleteId === ann.id ? (
                    <>
                      <span className="text-xs text-red-600 font-medium mr-1">Delete this?</span>
                      <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                        onClick={() => { deleteMutation.mutate(ann.id); setConfirmDeleteId(null) }}
                        disabled={deleteMutation.isPending}>
                        Delete
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                      onClick={() => setConfirmDeleteId(ann.id)}>
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
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Announcement title..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Write your announcement..." className="h-32 resize-none" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Sending...' : 'Send Announcement'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
