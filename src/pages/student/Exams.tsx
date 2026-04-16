import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  BookOpen,
  AlertTriangle,
  Trophy,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { MockTest } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Questions as returned to the student — correct_answer is deliberately excluded */
interface QuestionWithoutAnswer {
  id: string
  test_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  order_index: number
}

/** Full question row, only used server-side after submission for scoring */
interface QuestionWithAnswer extends QuestionWithoutAnswer {
  correct_answer: 'a' | 'b' | 'c' | 'd'
}

interface ReviewItem {
  question: QuestionWithoutAnswer
  selected: string
  correct: string
  isCorrect: boolean
}

interface AttemptResult {
  score: number
  total_questions: number
  percentage: number
  review: ReviewItem[]
}

interface PreviousAttempt {
  test_id: string
  score: number
  total_questions: number
  percentage: number
  submitted_at: string
}

const OPTIONS = ['a', 'b', 'c', 'd'] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentExams() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Exam state
  const [activeTest, setActiveTest] = useState<MockTest | null>(null)
  const [questions, setQuestions] = useState<QuestionWithoutAnswer[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [examStartedAt, setExamStartedAt] = useState<number>(0)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [loadingExam, setLoadingExam] = useState(false)

  // Keep a ref so the timer callback always has the latest answers without
  // needing to re-register the interval whenever answers changes.
  const answersRef = useRef<Record<string, string>>({})
  answersRef.current = answers

  const activeTestRef = useRef<MockTest | null>(null)
  activeTestRef.current = activeTest

  const storageKey = activeTest ? `exam_answers_${activeTest.id}` : null

  // ── Persist answers to localStorage on every change ───────────────────────

  useEffect(() => {
    if (storageKey && Object.keys(answers).length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(answers))
    }
  }, [answers, storageKey])

  // ── Queries ───────────────────────────────────────────────────────────────

  const deptId = profile?.department_id ?? null

  const { data: tests, isLoading } = useQuery({
    queryKey: ['student-exams', deptId],
    enabled: !!profile && !!deptId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('status', 'published')
        .or(`department_id.is.null,department_id.eq.${deptId}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as MockTest[]
    },
  })

  const { data: attempts } = useQuery({
    queryKey: ['student-attempts', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('mock_attempts')
        .select('test_id, score, total_questions, percentage, submitted_at')
        .eq('student_id', profile!.id)
        .not('submitted_at', 'is', null)
      return (data ?? []) as PreviousAttempt[]
    },
  })

  const attemptMap = new Map(attempts?.map((a) => [a.test_id, a]) ?? [])

  // ── Submit mutation ───────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async ({
      testId,
      submittedAnswers,
      timeTakenSeconds,
    }: {
      testId: string
      submittedAnswers: Record<string, string>
      timeTakenSeconds: number
    }): Promise<AttemptResult> => {
      // Fetch correct answers ONLY at submission time — never exposed beforehand
      const { data: correctData, error } = await supabase
        .from('mock_questions')
        .select(
          'id, test_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_index',
        )
        .eq('test_id', testId)
        .order('order_index')
      if (error) throw error

      let score = 0
      const reviewData: ReviewItem[] = (correctData as QuestionWithAnswer[]).map((q) => {
        const selected = submittedAnswers[q.id] ?? ''
        const isCorrect = selected === q.correct_answer
        if (isCorrect) score++
        // Strip correct_answer from the question object stored in review
        const { correct_answer, ...questionWithoutAnswer } = q
        return {
          question: questionWithoutAnswer as QuestionWithoutAnswer,
          selected,
          correct: correct_answer,
          isCorrect,
        }
      })

      const total = correctData.length
      const pct = total ? Math.round((score / total) * 100) : 0

      const { error: insertError } = await supabase.from('mock_attempts').insert({
        student_id: profile!.id,
        test_id: testId,
        answers: submittedAnswers,
        score,
        total_questions: total,
        percentage: pct,
        submitted_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds,
      })
      if (insertError) throw insertError

      return { score, total_questions: total, percentage: pct, review: reviewData }
    },
    onSuccess: (data) => {
      setResult(data)
      if (storageKey) sessionStorage.removeItem(storageKey)
      queryClient.invalidateQueries({ queryKey: ['student-attempts'] })
    },
    onError: (e: Error) =>
      toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }),
  })

  // ── Submit handler ────────────────────────────────────────────────────────

  // Wrapped in useCallback so we can safely call it from the timer effect.
  // Uses refs to avoid stale closure issues.
  const handleSubmit = useCallback(
    (_auto = false) => {
      const test = activeTestRef.current
      if (!test) return
      setConfirmSubmit(false)
      const timeTaken = Math.round((Date.now() - examStartedAt) / 1000)
      submitMutation.mutate({
        testId: test.id,
        submittedAnswers: answersRef.current,
        timeTakenSeconds: timeTaken,
      })
    },
    // submitMutation is stable across renders; refs never change identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submitMutation],
  )

  // ── Countdown timer ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeTest || result) return

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          handleSubmit(true)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // We intentionally only restart the timer when activeTest or result changes.
    // handleSubmit is stable thanks to useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTest, result, examStartedAt])

  // ── Start exam ────────────────────────────────────────────────────────────

  const startExam = async (test: MockTest) => {
    setLoadingExam(true)

    // Fetch questions WITHOUT correct_answer
    const { data, error } = await supabase
      .from('mock_questions')
      .select('id, test_id, question_text, option_a, option_b, option_c, option_d, order_index')
      .eq('test_id', test.id)
      .order('order_index')

    setLoadingExam(false)

    if (error || !data?.length) {
      toast({
        title: 'Error',
        description: 'Could not load exam questions.',
        variant: 'destructive',
      })
      return
    }

    // Restore any saved answers from a previous interrupted session (tab-scoped only)
    const saved = sessionStorage.getItem(`exam_answers_${test.id}`)
    const savedAnswers: Record<string, string> = saved ? JSON.parse(saved) : {}

    setActiveTest(test)
    setQuestions(data as QuestionWithoutAnswer[])
    setAnswers(savedAnswers)
    setCurrentQ(0)
    setTimeLeft(test.time_limit * 60)
    setExamStartedAt(Date.now())
    setResult(null)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const optionText = (q: QuestionWithoutAnswer, opt: (typeof OPTIONS)[number]) =>
    q[`option_${opt}` as keyof QuestionWithoutAnswer] as string

  // ── Tests list view ───────────────────────────────────────────────────────

  if (!activeTest) {
    return (
      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Mock Exams</h1>
          <p className="text-brand-grey mt-1 text-sm">Take practice tests to prepare for your exams</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : !tests?.length ? (
          <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
            <BookOpen className="h-8 w-8 text-brand-grey mx-auto mb-3" />
            <p className="text-brand-grey">No exams available yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {tests.map((test) => {
              const prev = attemptMap.get(test.id)
              return (
                <div
                  key={test.id}
                  className="bg-white rounded-lg border border-brand-border p-5 flex flex-col"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {test.is_weekly_challenge && (
                        <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <h3 className="font-semibold text-brand-text leading-snug">{test.title}</h3>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {test.subject}
                    </Badge>
                  </div>
                  {test.is_weekly_challenge && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      <Trophy className="h-3 w-3" /> Weekly Challenge — submit to appear on the leaderboard
                    </div>
                  )}

                  {/* Instructions preview */}
                  {test.instructions && (
                    <p className="text-xs text-brand-grey mb-3 line-clamp-2">
                      {test.instructions}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-brand-grey mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {test.time_limit} min
                    </span>
                  </div>

                  {/* Previous attempt badge */}
                  {prev && (
                    <div
                      className={`mb-3 p-2 rounded text-xs font-medium ${
                        prev.percentage >= 50
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      Last attempt: {prev.score}/{prev.total_questions} ({prev.percentage}%) —{' '}
                      {prev.percentage >= 50 ? 'PASS' : 'FAIL'}
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full mt-auto bg-brand-primary hover:bg-brand-secondary"
                    disabled={loadingExam}
                    onClick={() => startExam(test)}
                  >
                    {loadingExam ? 'Loading...' : prev ? 'Retake Exam' : 'Start Exam'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Results view ──────────────────────────────────────────────────────────

  if (result) {
    const pass = result.percentage >= 50

    return (
      <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Score card */}
        <div
          className={`rounded-xl p-6 text-center ${
            pass ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          {pass ? (
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          ) : (
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
          )}
          <h2 className="text-2xl font-bold mb-1">{pass ? 'PASS' : 'FAIL'}</h2>
          <p className="text-4xl font-bold mb-1">
            {result.score}/{result.total_questions}
          </p>
          <p className="text-lg text-brand-grey">{result.percentage}%</p>
          <p className="text-sm text-brand-grey mt-2">{activeTest.title}</p>
        </div>

        {/* Full review */}
        <div className="space-y-3">
          <h3 className="font-semibold text-brand-text">Review</h3>
          {result.review.map((item, idx) => (
            <div
              key={item.question.id}
              className={`bg-white rounded-lg border p-4 ${
                item.isCorrect ? 'border-green-200' : 'border-red-200'
              }`}
            >
              <p className="font-medium text-sm mb-3 text-brand-text">
                {idx + 1}. {item.question.question_text}
              </p>
              {OPTIONS.map((opt) => {
                const text = optionText(item.question, opt)
                const isSelected = item.selected === opt
                const isCorrectOpt = item.correct === opt
                return (
                  <div
                    key={opt}
                    className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded mb-1 ${
                      isCorrectOpt
                        ? 'bg-green-50 text-green-800 font-medium'
                        : isSelected && !isCorrectOpt
                        ? 'bg-red-50 text-red-800'
                        : 'text-brand-grey'
                    }`}
                  >
                    <span className="uppercase font-bold w-4 shrink-0">{opt}.</span>
                    <span className="flex-1">{text}</span>
                    {isCorrectOpt && (
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    )}
                    {isSelected && !isCorrectOpt && (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <Button
          className="w-full bg-brand-primary hover:bg-brand-secondary"
          onClick={() => {
            setActiveTest(null)
            setResult(null)
            setQuestions([])
            setAnswers({})
          }}
        >
          Back to Exams
        </Button>
      </div>
    )
  }

  // ── Active exam view ──────────────────────────────────────────────────────

  const q = questions[currentQ]
  const answeredCount = Object.keys(answers).length
  const isTimeLow = timeLeft <= 60

  return (
    <div className="min-h-screen bg-brand-background flex flex-col">
      {/* Sticky exam header */}
      <div className="sticky top-0 z-10 bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-brand-text truncate max-w-xs">{activeTest.title}</h2>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 font-mono font-bold px-3 py-1 rounded-lg shrink-0 ${
            isTimeLow
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-brand-pale text-brand-primary border border-brand-border'
          }`}
        >
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>

        <Button
          size="sm"
          className="bg-brand-primary hover:bg-brand-secondary shrink-0"
          onClick={() => setConfirmSubmit(true)}
          disabled={submitMutation.isPending}
        >
          Submit
        </Button>
      </div>

      {/* Mobile question navigator — horizontal scroll strip at top */}
      <div className="sm:hidden bg-white border-b border-brand-border px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-xs font-medium text-brand-grey shrink-0">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-1 pb-1" style={{ width: 'max-content' }}>
            {questions.map((qs, i) => (
              <button
                key={qs.id}
                onClick={() => setCurrentQ(i)}
                title={`Question ${i + 1}${answers[qs.id] ? ' (answered)' : ''}`}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors shrink-0 ${
                  currentQ === i ? 'ring-2 ring-brand-primary ring-offset-1' : ''
                } ${
                  answers[qs.id]
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-brand-grey'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question navigator sidebar (desktop) */}
        <aside className="hidden sm:flex flex-col w-48 border-r border-brand-border p-3 bg-white overflow-y-auto shrink-0">
          <p className="text-xs font-medium text-brand-grey mb-2">
            {answeredCount}/{questions.length} answered
          </p>
          <div className="grid grid-cols-5 gap-1">
            {questions.map((qs, i) => (
              <button
                key={qs.id}
                onClick={() => setCurrentQ(i)}
                title={`Question ${i + 1}${answers[qs.id] ? ' (answered)' : ''}`}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  currentQ === i ? 'ring-2 ring-brand-primary ring-offset-1' : ''
                } ${
                  answers[qs.id]
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-brand-grey hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </aside>

        {/* Question area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-brand-grey mb-1">
              Question {currentQ + 1} of {questions.length}
            </p>
            <p className="text-base sm:text-lg font-medium text-brand-text mb-5 leading-relaxed">{q.question_text}</p>

            {/* Options — minimum 48px touch height */}
            <div className="space-y-2 sm:space-y-3">
              {OPTIONS.map((opt) => {
                const text = optionText(q, opt)
                const isSelected = answers[q.id] === opt
                return (
                  <button
                    key={opt}
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                    }
                    className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-lg border text-left transition-colors min-h-[48px] ${
                      isSelected
                        ? 'border-brand-primary bg-brand-pale text-brand-text'
                        : 'border-brand-border bg-white text-brand-grey hover:border-brand-secondary hover:bg-brand-background'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border shrink-0 ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'border-brand-border'
                      }`}
                    >
                      {opt.toUpperCase()}
                    </span>
                    <span className="text-sm">{text}</span>
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-5 sm:mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                disabled={currentQ === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>

              {currentQ < questions.length - 1 ? (
                <Button
                  className="bg-brand-primary hover:bg-brand-secondary"
                  onClick={() => setCurrentQ((q) => q + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="bg-brand-primary hover:bg-brand-secondary"
                  onClick={() => setConfirmSubmit(true)}
                >
                  Submit Exam
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Confirm submit dialog */}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Submit Exam?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-grey">
            You have answered{' '}
            <span className="font-semibold text-brand-text">{answeredCount}</span> of{' '}
            <span className="font-semibold text-brand-text">{questions.length}</span> questions.
            This action cannot be undone.
          </p>
          {answeredCount < questions.length && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {questions.length - answeredCount} question
              {questions.length - answeredCount !== 1 ? 's' : ''} left unanswered.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Review Answers
            </Button>
            <Button
              className="bg-brand-primary hover:bg-brand-secondary"
              onClick={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
