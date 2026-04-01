import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  urgency: z.enum(['normal', 'urgent', 'critical']),
})
type FormData = z.infer<typeof schema>

export default function GovernorNotifications() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [sent, setSent] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governor-notifications'] })
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', message: '', urgency: 'normal' },
  })

  const { data: recentNotifications, isLoading } = useQuery({
    queryKey: ['governor-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!profile,
  })

  const { data: studentCount } = useQuery({
    queryKey: ['student-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student')
      return count || 0
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
      if (!students?.length) throw new Error('No students found')

      const rows = students.map(s => ({
        student_id: s.id,
        title: data.title,
        message: data.message,
        urgency: data.urgency,
      }))

      const { error } = await supabase.from('notifications').insert(rows)
      if (error) throw error
      return students.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['governor-notifications'] })
      toast({ title: `Notification sent to ${count} students` })
      form.reset()
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    },
    onError: (e: Error) => toast({ title: 'Failed to send', description: e.message, variant: 'destructive' }),
  })

  const urgencyVariant = (u: string): 'danger' | 'warning' | 'outline' => {
    if (u === 'critical') return 'danger'
    if (u === 'urgent') return 'warning'
    return 'outline'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Notifications</h1>
        <p className="text-brand-grey mt-1">Broadcast to all students</p>
      </div>

      <div className="bg-white rounded-lg border border-brand-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-brand-primary" />
          <h2 className="font-semibold text-brand-text">Send Notification</h2>
          {studentCount !== undefined && (
            <span className="text-xs text-brand-grey ml-auto">Will reach {studentCount} students</span>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => sendMutation.mutate(d))} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Notification title..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="urgency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl><Textarea className="h-24 resize-none" placeholder="Write your notification message..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end">
              <Button
                type="submit"
                className={`${sent ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-primary hover:bg-brand-secondary'}`}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? 'Sending...' : sent ? 'Sent!' : 'Send to All Students'}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div>
        <h2 className="font-semibold text-brand-text mb-3">Recently Sent</h2>
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : recentNotifications?.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-brand-border">
            <p className="text-brand-grey text-sm">No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotifications?.map(n => (
              <div key={n.id} className={`rounded-lg border p-4 transition-colors ${confirmDeleteId === n.id ? 'border-red-300 bg-red-50' : 'bg-white border-brand-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-brand-text">{n.title}</span>
                      <Badge variant={urgencyVariant(n.urgency)} className="text-xs">{n.urgency}</Badge>
                    </div>
                    <p className="text-xs text-brand-grey line-clamp-2">{n.message}</p>
                    <p className="text-xs text-brand-grey mt-1">{formatDate(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {confirmDeleteId === n.id ? (
                      <>
                        <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2"
                          onClick={() => { deleteMutation.mutate(n.id); setConfirmDeleteId(null) }}
                          disabled={deleteMutation.isPending}>
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDeleteId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                        onClick={() => setConfirmDeleteId(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
