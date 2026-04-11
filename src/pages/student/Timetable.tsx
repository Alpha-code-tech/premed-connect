import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Calendar, List, Trash2, Edit2, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import type { TimetableEntry } from '@/types'
import TopicTracker from '@/components/student/TopicTracker'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<TimetableEntry['status'], string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-green-50 text-green-800 border-green-200',
}

const STATUS_LABELS: Record<TimetableEntry['status'], string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
}

const entrySchema = z
  .object({
    subject: z.string().min(1, 'Subject is required'),
    topic: z.string().min(1, 'Topic is required'),
    day_of_week: z.string().min(1, 'Day is required'),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    note: z.string().optional(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  })

type EntryForm = z.infer<typeof entrySchema>

export default function StudentTimetable() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null)

  const form = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      subject: '',
      topic: '',
      day_of_week: 'Monday',
      start_time: '',
      end_time: '',
      note: '',
    },
  })

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: entries, isLoading } = useQuery({
    queryKey: ['timetable', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('student_id', profile!.id)
        .order('day_of_week')
        .order('start_time')
      if (error) throw error
      return data as TimetableEntry[]
    },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: EntryForm) => {
      const { error } = await supabase.from('timetable_entries').insert({
        student_id: profile!.id,
        subject: data.subject,
        topic: data.topic,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        note: data.note || null,
        status: 'not_started',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast({ title: 'Session added' })
      setDialogOpen(false)
      form.reset()
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<TimetableEntry>
    }) => {
      const { error } = await supabase
        .from('timetable_entries')
        .update(data)
        .eq('id', id)
        .eq('student_id', profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast({ title: 'Updated' })
      setDialogOpen(false)
      setEditEntry(null)
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('id', id)
        .eq('student_id', profile!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      toast({ title: 'Session deleted' })
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const cycleStatus = (entry: TimetableEntry) => {
    const next: TimetableEntry['status'] =
      entry.status === 'not_started'
        ? 'in_progress'
        : entry.status === 'in_progress'
        ? 'completed'
        : 'not_started'
    updateMutation.mutate({ id: entry.id, data: { status: next } })
  }

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry)
    form.reset({
      subject: entry.subject,
      topic: entry.topic,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      note: entry.note ?? '',
    })
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditEntry(null)
    form.reset({
      subject: '',
      topic: '',
      day_of_week: 'Monday',
      start_time: '',
      end_time: '',
      note: '',
    })
    setDialogOpen(true)
  }

  const onSubmit = (data: EntryForm) => {
    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  // Entries grouped by day name
  const byDay = DAYS.map((day) => entries?.filter((e) => e.day_of_week === day) ?? [])

  // Subject-level progress
  const subjects = [...new Set(entries?.map((e) => e.subject) ?? [])]
  const subjectProgress = subjects.map((subject) => {
    const all = entries?.filter((e) => e.subject === subject) ?? []
    const done = all.filter((e) => e.status === 'completed').length
    return {
      subject,
      total: all.length,
      done,
      pct: all.length ? Math.round((done / all.length) * 100) : 0,
    }
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Study Timetable</h1>
          <p className="text-brand-grey mt-1">Manage your weekly study schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
          >
            {view === 'grid' ? (
              <List className="h-4 w-4 mr-1" />
            ) : (
              <Calendar className="h-4 w-4 mr-1" />
            )}
            {view === 'grid' ? 'List' : 'Grid'}
          </Button>
          <Button
            size="sm"
            className="bg-brand-primary hover:bg-brand-secondary"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Session
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : view === 'list' ? (
        /* ── List view ── */
        <div className="space-y-4">
          {DAYS.map(
            (day, i) =>
              byDay[i].length > 0 && (
                <div
                  key={day}
                  className="bg-white rounded-lg border border-brand-border overflow-hidden"
                >
                  {/* Day header */}
                  <div className="px-4 py-2 bg-brand-pale border-b border-brand-border">
                    <h3 className="font-semibold text-brand-primary text-sm">{day}</h3>
                  </div>

                  {/* Entries */}
                  <div className="divide-y divide-brand-border">
                    {byDay[i].map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3">
                        {/* Status badge – click to cycle */}
                        <button
                          onClick={() => cycleStatus(entry)}
                          title="Click to change status"
                          className={`px-2 py-0.5 rounded-full text-xs border font-medium transition-colors shrink-0 ${STATUS_COLORS[entry.status]}`}
                        >
                          {STATUS_LABELS[entry.status]}
                        </button>

                        {/* Subject / topic */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">
                            {entry.subject}
                          </p>
                          <p className="text-xs text-brand-grey truncate">{entry.topic}</p>
                        </div>

                        {/* Time range */}
                        <div className="flex items-center gap-1 text-xs text-brand-grey shrink-0">
                          <Clock className="h-3 w-3" />
                          {entry.start_time} – {entry.end_time}
                        </div>

                        {/* Note indicator */}
                        {entry.note && (
                          <span
                            title={entry.note}
                            className="text-xs text-brand-grey shrink-0 hidden md:block max-w-[120px] truncate"
                          >
                            {entry.note}
                          </span>
                        )}

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => openEdit(entry)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}

          {/* Empty state */}
          {(entries?.length ?? 0) === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
              <Calendar className="h-8 w-8 text-brand-grey mx-auto mb-3" />
              <p className="text-brand-grey">No sessions yet. Add your first study session.</p>
              <Button
                size="sm"
                className="mt-4 bg-brand-primary hover:bg-brand-secondary"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Session
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[700px]">
            {/* Day headers */}
            {DAY_SHORT.map((d) => (
              <div
                key={d}
                className="px-2 py-3 text-center text-xs font-semibold text-brand-primary border-b border-brand-border bg-brand-pale"
              >
                {d}
              </div>
            ))}

            {/* Day columns */}
            {DAYS.map((_, i) => (
              <div
                key={i}
                className="min-h-32 p-1 border-r last:border-r-0 border-brand-border/50 space-y-1 align-top"
              >
                {byDay[i].length === 0 ? (
                  <button
                    onClick={() => {
                      openCreate()
                      form.setValue('day_of_week', DAYS[i])
                    }}
                    className="w-full h-full min-h-[6rem] flex items-center justify-center text-brand-border hover:text-brand-grey transition-colors"
                    title={`Add session for ${DAYS[i]}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : (
                  byDay[i].map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => openEdit(entry)}
                      className={`p-1.5 rounded text-xs cursor-pointer border transition-opacity hover:opacity-80 ${STATUS_COLORS[entry.status]}`}
                    >
                      <p className="font-medium truncate">{entry.subject}</p>
                      <p className="truncate opacity-75">{entry.topic}</p>
                      <p className="truncate opacity-60 mt-0.5">
                        {entry.start_time} – {entry.end_time}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject progress */}
      {subjectProgress.length > 0 && (
        <div className="bg-white rounded-lg border border-brand-border p-4">
          <h3 className="font-semibold text-brand-text mb-3">Subject Progress</h3>
          <div className="space-y-3">
            {subjectProgress.map(({ subject, total, done, pct }) => (
              <div key={subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-text font-medium">{subject}</span>
                  <span className="text-brand-grey">
                    {done}/{total} completed ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Topic Tracker */}
      <div>
        <h2 className="text-lg font-semibold text-brand-text mb-3">Course Topic Tracker</h2>
        <TopicTracker />
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditEntry(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Session' : 'Add Study Session'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Subject + Day row */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Anatomy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="day_of_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Topic */}
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bones of the upper limb" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start / End time row */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Note */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes..."
                        className="h-20 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-secondary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editEntry ? 'Update' : 'Add Session'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
