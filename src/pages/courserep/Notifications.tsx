// Course rep can send notifications to dept students
// Fields: title, message, urgency (Normal/Urgent), optional scheduling
// On submit: insert one notification row per eligible student in dept
// List of sent notifications

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

const notifSchema = z.object({
  title: z.string().min(3, 'Title required'),
  message: z.string().min(5, 'Message required'),
  urgency: z.enum(['normal', 'urgent']),
  scheduled_for: z.string().optional(),
})
type NotifForm = z.infer<typeof notifSchema>

export default function CourseRepNotifications() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const form = useForm<NotifForm>({ resolver: zodResolver(notifSchema), defaultValues: { title: '', message: '', urgency: 'normal', scheduled_for: '' } })

  const { data: recentNotifs, isLoading } = useQuery({
    queryKey: ['courserep-sent-notifications', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      // Get a sample of recently sent notifications by finding ones sent to dept students
      const { data: deptStudents } = await supabase.from('profiles').select('id').eq('department_id', profile!.department_id!).eq('role', 'student')
      const ids = deptStudents?.map(s => s.id) || []
      if (!ids.length) return []
      const { data } = await supabase.from('notifications').select('*').in('student_id', ids.slice(0, 1)).order('created_at', { ascending: false }).limit(20)
      return data || []
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (data: NotifForm) => {
      const { data: students, error } = await supabase.from('profiles').select('id').eq('department_id', profile!.department_id!).eq('role', 'student')
      if (error) throw error
      if (!students?.length) throw new Error('No students found in your department')

      const notifs = students.map(s => ({
        student_id: s.id,
        title: data.title,
        message: data.message,
        urgency: data.urgency,
        is_read: false,
      }))

      const { error: insertError } = await supabase.from('notifications').insert(notifs)
      if (insertError) throw insertError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courserep-sent-notifications'] })
      toast({ title: 'Notification sent', description: `Sent to all department students` })
      setOpen(false)
      form.reset()
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Notifications</h1>
          <p className="text-brand-grey mt-1">Send notifications to your department students</p>
        </div>
        <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Send Notification
        </Button>
      </div>

      <div className="bg-brand-pale/50 rounded-lg border border-brand-border p-4 text-sm text-brand-grey">
        Notifications sent here will be delivered to all students in your department.
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-2">
          <h3 className="font-medium text-brand-text">Recent Notifications</h3>
          {recentNotifs?.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-brand-border">
              <Bell className="h-6 w-6 text-brand-grey mx-auto mb-2" />
              <p className="text-sm text-brand-grey">No notifications sent yet</p>
            </div>
          ) : (
            recentNotifs?.map(n => (
              <div key={n.id} className="bg-white rounded-lg border border-brand-border p-3 flex items-start gap-3">
                <Badge variant={n.urgency === 'urgent' ? 'danger' : 'outline'} className="shrink-0">{n.urgency}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm text-brand-text">{n.title}</p>
                  <p className="text-xs text-brand-grey mt-0.5">{n.message}</p>
                  <p className="text-xs text-brand-grey mt-1">{formatDate(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => sendMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Notification title" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Write your message..." className="h-24 resize-none" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="urgency" render={({ field }) => (
                <FormItem><FormLabel>Urgency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="scheduled_for" render={({ field }) => (
                <FormItem><FormLabel>Schedule (optional)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand-primary hover:bg-brand-secondary" disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
