import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface CourseTopic {
  id: string
  student_id: string
  course_code: string
  course_name: string
  topic_name: string
  is_completed: boolean
  created_by: 'student' | 'course_rep'
  created_at: string
}

interface CourseGroup {
  course_code: string
  course_name: string
  topics: CourseTopic[]
}

// ── Circular progress SVG ────────────────────────────────────────────────────

function CircularProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#B2DBC2" strokeWidth={8} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="#0D5C2E" strokeWidth={8} fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  )
}

// ── Single course card ───────────────────────────────────────────────────────

function CourseCard({ group, studentId }: { group: CourseGroup; studentId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [adding, setAdding] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const done = group.topics.filter(t => t.is_completed).length
  const total = group.topics.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('course_topics')
        .update({ is_completed })
        .eq('id', id)
        .eq('student_id', studentId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-topics', studentId] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const addMutation = useMutation({
    mutationFn: async (topicName: string) => {
      const { error } = await supabase.from('course_topics').insert({
        student_id: studentId,
        course_code: group.course_code,
        course_name: group.course_name,
        topic_name: topicName.trim(),
        is_completed: false,
        created_by: 'student',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-topics', studentId] })
      setNewTopic('')
      setAdding(false)
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('course_topics')
        .delete()
        .eq('id', id)
        .eq('student_id', studentId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-topics', studentId] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleAdd = () => {
    const trimmed = newTopic.trim()
    if (!trimmed) return
    if (trimmed.length > 300) {
      toast({ title: 'Topic too long', description: 'Max 300 characters.', variant: 'destructive' })
      return
    }
    addMutation.mutate(trimmed)
  }

  return (
    <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
      {/* Card header — always visible */}
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-brand-pale/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Course info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-brand-primary bg-brand-pale px-2 py-0.5 rounded">
              {group.course_code}
            </span>
            <span className="text-sm font-semibold text-brand-text truncate">{group.course_name}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={pct} className="h-2 flex-1" />
            <span className="text-xs text-brand-grey whitespace-nowrap shrink-0">
              {done}/{total} topics ({pct}%)
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-brand-grey shrink-0" />
          : <ChevronDown className="h-4 w-4 text-brand-grey shrink-0" />
        }
      </button>

      {/* Expanded topic list */}
      {expanded && (
        <div className="border-t border-brand-border">
          {group.topics.length === 0 ? (
            <p className="text-sm text-brand-grey text-center py-4">No topics yet. Add one below.</p>
          ) : (
            <ul className="divide-y divide-brand-border">
              {group.topics.map(topic => (
                <li key={topic.id} className="flex items-center gap-3 px-4 py-2.5 group">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleMutation.mutate({ id: topic.id, is_completed: !topic.is_completed })}
                    disabled={toggleMutation.isPending}
                    className="shrink-0"
                    aria-label={topic.is_completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    <CheckCircle2
                      className={cn(
                        'h-5 w-5 transition-colors',
                        topic.is_completed ? 'text-brand-primary' : 'text-brand-border hover:text-brand-primary/50'
                      )}
                    />
                  </button>

                  {/* Topic name */}
                  <span className={cn(
                    'flex-1 text-sm',
                    topic.is_completed ? 'line-through text-brand-grey' : 'text-brand-text'
                  )}>
                    {topic.topic_name}
                  </span>

                  {/* Source badge */}
                  {topic.created_by === 'course_rep' && (
                    <span className="text-[10px] text-brand-primary bg-brand-pale px-1.5 py-0.5 rounded shrink-0">
                      Rep
                    </span>
                  )}

                  {/* Delete — only for student-created topics */}
                  {topic.created_by === 'student' && (
                    <button
                      onClick={() => deleteMutation.mutate(topic.id)}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 shrink-0 text-red-400 hover:text-red-600 transition-all"
                      aria-label="Delete topic"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add topic */}
          <div className="p-3 border-t border-brand-border bg-brand-pale/30">
            {adding ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="Topic name..."
                  className="h-8 text-sm"
                  maxLength={300}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(false); setNewTopic('') }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 bg-brand-primary hover:bg-brand-secondary shrink-0"
                  onClick={handleAdd}
                  disabled={addMutation.isPending || !newTopic.trim()}
                >
                  {addMutation.isPending ? '...' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={() => { setAdding(false); setNewTopic('') }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-secondary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add topic
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── New course form ──────────────────────────────────────────────────────────

function AddCourseForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [topicName, setTopicName] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('course_topics').insert({
        student_id: studentId,
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
        topic_name: topicName.trim(),
        is_completed: false,
        created_by: 'student',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-topics', studentId] })
      onDone()
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const valid = courseCode.trim() && courseName.trim() && topicName.trim()

  return (
    <div className="bg-white rounded-xl border border-brand-border p-4 space-y-3">
      <h4 className="text-sm font-semibold text-brand-text">Add New Course</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-brand-grey mb-1 block">Course Code</label>
          <Input
            placeholder="e.g. CHM 101"
            value={courseCode}
            onChange={e => setCourseCode(e.target.value)}
            maxLength={20}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-brand-grey mb-1 block">Course Name</label>
          <Input
            placeholder="e.g. General Chemistry I"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            maxLength={200}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-brand-grey mb-1 block">First Topic</label>
        <Input
          placeholder="e.g. Atomic Structure"
          value={topicName}
          onChange={e => setTopicName(e.target.value)}
          maxLength={300}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button
          size="sm"
          className="bg-brand-primary hover:bg-brand-secondary"
          disabled={!valid || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending ? 'Adding...' : 'Add Course'}
        </Button>
      </div>
    </div>
  )
}

// ── Main exported component ──────────────────────────────────────────────────

interface TopicTrackerProps {
  /** When true, shows only the circular summary (for Dashboard use) */
  summaryOnly?: boolean
}

export default function TopicTracker({ summaryOnly = false }: TopicTrackerProps) {
  const { profile } = useAuth()
  const [showAddCourse, setShowAddCourse] = useState(false)

  const { data: topics, isLoading } = useQuery<CourseTopic[]>({
    queryKey: ['course-topics', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_topics')
        .select('*')
        .eq('student_id', profile!.id)
        .order('course_code')
        .order('created_at')
      if (error) throw error
      return data as CourseTopic[]
    },
  })

  if (!profile) return null

  // Group by course_code
  const groups: CourseGroup[] = []
  const seen = new Map<string, CourseGroup>()
  for (const t of topics ?? []) {
    if (!seen.has(t.course_code)) {
      const g: CourseGroup = { course_code: t.course_code, course_name: t.course_name, topics: [] }
      seen.set(t.course_code, g)
      groups.push(g)
    }
    seen.get(t.course_code)!.topics.push(t)
  }

  const totalTopics = topics?.length ?? 0
  const completedTopics = topics?.filter(t => t.is_completed).length ?? 0
  const remainingTopics = totalTopics - completedTopics
  const overallPct = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0

  // ── Summary-only mode (for Dashboard) ──────────────────────────────────────
  if (summaryOnly) {
    if (isLoading) return <Skeleton className="h-24 w-full" />
    if (totalTopics === 0) return null
    return (
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <CircularProgress pct={overallPct} size={72} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-text rotate-90">
            {overallPct}%
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand-text">{completedTopics}/{totalTopics} topics completed</p>
          <p className="text-xs text-brand-grey">{remainingTopics} remaining across {groups.length} course{groups.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    )
  }

  // ── Full tracker (for Timetable page) ──────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Overall summary */}
      {totalTopics > 0 && (
        <div className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-6 flex-wrap">
          <div className="relative shrink-0">
            <CircularProgress pct={overallPct} size={80} />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-text rotate-90">
              {overallPct}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1 min-w-0">
            <div>
              <p className="text-lg sm:text-2xl font-bold text-brand-text">{totalTopics}</p>
              <p className="text-xs text-brand-grey">Total topics</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-brand-primary">{completedTopics}</p>
              <p className="text-xs text-brand-grey">Completed</p>
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">{remainingTopics}</p>
              <p className="text-xs text-brand-grey">Remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalTopics === 0 && !showAddCourse && (
        <div className="text-center py-10 bg-white rounded-xl border border-brand-border">
          <CheckCircle2 className="h-8 w-8 text-brand-border mx-auto mb-3" />
          <p className="text-brand-grey font-medium">No courses tracked yet</p>
          <p className="text-sm text-brand-grey mt-1 mb-4">Add your courses and topics to track your study progress.</p>
          <Button
            size="sm"
            className="bg-brand-primary hover:bg-brand-secondary"
            onClick={() => setShowAddCourse(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add First Course
          </Button>
        </div>
      )}

      {/* Course cards */}
      {groups.map(group => (
        <CourseCard key={group.course_code} group={group} studentId={profile.id} />
      ))}

      {/* Add course form / button */}
      {showAddCourse ? (
        <AddCourseForm studentId={profile.id} onDone={() => setShowAddCourse(false)} />
      ) : totalTopics > 0 && (
        <button
          onClick={() => setShowAddCourse(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand-border rounded-xl text-sm text-brand-grey hover:border-brand-primary hover:text-brand-primary transition-colors"
        >
          <Plus className="h-4 w-4" /> Add another course
        </button>
      )}
    </div>
  )
}
