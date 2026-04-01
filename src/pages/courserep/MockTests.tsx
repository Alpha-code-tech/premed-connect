import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, CheckCircle, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDateShort } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'

interface QuestionDraft {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'a' | 'b' | 'c' | 'd'
}

interface TestWithCreator {
  id: string
  title: string
  subject: string
  time_limit: number
  instructions: string | null
  status: 'draft' | 'published'
  department_id: string | null
  created_by: string
  created_at: string
  profiles: { full_name: string; role: string } | null
}

const emptyQuestion = (): QuestionDraft => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a'
})

export default function CourseRepMockTests() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [timeLimit, setTimeLimit] = useState('60')
  const [instructions, setInstructions] = useState('')
  const [scope, setScope] = useState<'department' | 'general'>('department')
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion()])
  const [saving, setSaving] = useState(false)

  const { data: tests, isLoading } = useQuery({
    queryKey: ['courserep-tests', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('mock_tests')
        .select('*, profiles:created_by(full_name, role)')
        .or(`department_id.is.null,department_id.eq.${profile!.department_id}`)
        .order('created_at', { ascending: false })
      return (data || []) as unknown as TestWithCreator[]
    },
  })

  const publishMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase.from('mock_tests').update({ status: 'published' }).eq('id', testId)
      if (error) throw error
      await supabase.from('audit_log').insert({
        action_type: 'mock_test_published',
        performed_by: profile!.id,
        affected_entity_type: 'mock_test',
        affected_entity_id: testId,
        metadata: {},
      })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courserep-tests'] }); toast({ title: 'Test published' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      await supabase.from('mock_questions').delete().eq('test_id', testId)
      const { error } = await supabase.from('mock_tests').delete().eq('id', testId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['courserep-tests'] }); toast({ title: 'Test deleted' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const addQuestion = () => setQuestions(q => [...q, emptyQuestion()])
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))
  const updateQuestion = (i: number, field: keyof QuestionDraft, value: string) => {
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const resetForm = () => {
    setTitle(''); setSubject(''); setTimeLimit('60'); setInstructions('')
    setScope('department')
    setQuestions([emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion(), emptyQuestion()])
  }

  const handleSave = async (publish: boolean) => {
    if (!title || !subject) { toast({ title: 'Title and subject are required', variant: 'destructive' }); return }
    if (questions.length < 5) { toast({ title: 'Minimum 5 questions required', variant: 'destructive' }); return }
    const invalid = questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)
    if (invalid) { toast({ title: 'All questions must be complete', variant: 'destructive' }); return }

    setSaving(true)
    try {
      const { data: test, error } = await supabase.from('mock_tests').insert({
        title, subject,
        time_limit: parseInt(timeLimit),
        instructions: instructions || null,
        status: publish ? 'published' : 'draft',
        department_id: scope === 'general' ? null : profile!.department_id,
        created_by: profile!.id,
      }).select().single()
      if (error) throw error

      const qRows = questions.map((q, i) => ({ ...q, test_id: test.id, order_index: i }))
      const { error: qError } = await supabase.from('mock_questions').insert(qRows)
      if (qError) throw qError

      if (publish) {
        await supabase.from('audit_log').insert({
          action_type: 'mock_test_published', performed_by: profile!.id,
          affected_entity_type: 'mock_test', affected_entity_id: test.id, metadata: {},
        })
      }

      queryClient.invalidateQueries({ queryKey: ['courserep-tests'] })
      toast({ title: publish ? 'Test published' : 'Test saved as draft' })
      setCreateOpen(false)
      resetForm()
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Mock Tests</h1>
          <p className="text-brand-grey mt-1">Create and manage mock tests</p>
        </div>
        <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Test
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : tests?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <FileText className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No mock tests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests?.map(test => (
            <div key={test.id} className="bg-white rounded-lg border border-brand-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-brand-text">{test.title}</h3>
                  <Badge variant={test.status === 'published' ? 'success' : 'outline'}>{test.status}</Badge>
                  <Badge variant="outline" className="text-xs">{test.department_id ? 'Department' : 'General'}</Badge>
                </div>
                <p className="text-sm text-brand-grey">
                  {test.subject} · {test.time_limit} min · {formatDateShort(test.created_at)}
                </p>
                {test.profiles && (
                  <p className="text-xs text-brand-grey mt-0.5">
                    Created by {test.profiles.full_name} — {ROLE_LABELS[test.profiles.role] || test.profiles.role}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {test.status === 'draft' && (
                  <Button size="sm" className="bg-brand-primary hover:bg-brand-secondary h-8 text-xs"
                    onClick={() => publishMutation.mutate(test.id)} disabled={publishMutation.isPending}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Publish
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500"
                  onClick={() => deleteMutation.mutate(test.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Test Dialog */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Mock Test</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Title *</label><Input className="mt-1" placeholder="Test title" value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Subject *</label><Input className="mt-1" placeholder="e.g. Anatomy" value={subject} onChange={e => setSubject(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Time Limit (minutes, 1–180)</label>
                <Input className="mt-1" type="number" min="1" max="180" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} /></div>
              <div>
                <label className="text-sm font-medium">Scope</label>
                <Select value={scope} onValueChange={v => setScope(v as 'department' | 'general')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="department">Department Only</SelectItem>
                    <SelectItem value="general">General (All Departments)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium">Instructions</label>
              <Textarea className="mt-1 h-20 resize-none" placeholder="Optional instructions for students..." value={instructions} onChange={e => setInstructions(e.target.value)} /></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-brand-text">Questions ({questions.length}/min 5)</h4>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3.5 w-3.5 mr-1" /> Add Question</Button>
              </div>
              {questions.map((q, i) => (
                <div key={i} className="border border-brand-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-text">Question {i + 1}</span>
                    {questions.length > 5 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => removeQuestion(i)}>Remove</Button>
                    )}
                  </div>
                  <Textarea className="h-16 resize-none text-sm" placeholder="Question text..." value={q.question_text} onChange={e => updateQuestion(i, 'question_text', e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    {(['a', 'b', 'c', 'd'] as const).map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase w-4">{opt}.</span>
                        <Input className="text-sm h-8" placeholder={`Option ${opt.toUpperCase()}`} value={q[`option_${opt}` as keyof QuestionDraft] as string} onChange={e => updateQuestion(i, `option_${opt}` as keyof QuestionDraft, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-grey">Correct answer:</span>
                    <Select value={q.correct_answer} onValueChange={v => updateQuestion(i, 'correct_answer', v)}>
                      <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['a', 'b', 'c', 'd'] as const).map(opt => <SelectItem key={opt} value={opt}>{opt.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>Save as Draft</Button>
            <Button className="bg-brand-primary hover:bg-brand-secondary" disabled={saving} onClick={() => handleSave(true)}>
              {saving ? 'Saving...' : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
