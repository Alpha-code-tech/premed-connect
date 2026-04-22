import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Phone screen illustrations ──────────────────────────────────────────────

function DashboardScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7] text-[#0D2B18]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">PreMed Connect</p>
        <p className="text-white/70 text-[7px]">Welcome back, Amaka</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Resources', val: '12', color: '#0D5C2E' },
            { label: 'Payments', val: '3 due', color: '#E67E22' },
            { label: 'Mock Tests', val: '5', color: '#3498DB' },
            { label: 'Issues', val: '1 open', color: '#E74C3C' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-md p-1.5 border border-gray-100">
              <p className="text-[8px] text-gray-500">{c.label}</p>
              <p className="text-[10px] font-bold mt-0.5" style={{ color: c.color }}>{c.val}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-md p-1.5 border border-gray-100">
          <p className="text-[8px] font-semibold text-[#0D5C2E] mb-1">Recent Announcements</p>
          {['Exam timetable released', 'Association dues reminder'].map(a => (
            <div key={a} className="flex items-center gap-1 py-0.5 border-b border-gray-50 last:border-0">
              <div className="w-1 h-1 rounded-full bg-[#0D5C2E] shrink-0" />
              <p className="text-[7px] text-gray-600 truncate">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PaymentsScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Payments</p>
        <p className="text-white/70 text-[7px]">Session 2025/2026</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        {[
          { name: 'Association Dues', amount: '₦5,000', status: 'Paid', color: '#2ECC71' },
          { name: 'Lab Fees', amount: '₦8,000', status: 'Unpaid', color: '#E74C3C' },
          { name: 'Exam Levy', amount: '₦3,500', status: 'Pending', color: '#E67E22' },
          { name: 'Library Fee', amount: '₦2,000', status: 'Paid', color: '#2ECC71' },
        ].map(p => (
          <div key={p.name} className="bg-white rounded-md px-2 py-1.5 border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-medium text-[#0D2B18]">{p.name}</p>
              <p className="text-[7px] text-gray-500">{p.amount}</p>
            </div>
            <span className="text-[6px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: p.color, backgroundColor: p.color + '20' }}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResourcesScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Resources</p>
        <p className="text-white/70 text-[7px]">Study Materials</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        {[
          { title: 'Anatomy — Past Questions', type: 'PDF', color: '#E74C3C' },
          { title: 'Biochemistry Notes', type: 'PDF', color: '#E74C3C' },
          { title: 'Physiology Slides', type: 'PPTX', color: '#E67E22' },
          { title: 'Pharmacology Guide', type: 'PDF', color: '#E74C3C' },
        ].map(r => (
          <div key={r.title} className="bg-white rounded-md px-2 py-1.5 border border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[6px] font-bold shrink-0" style={{ backgroundColor: r.color }}>
              {r.type}
            </div>
            <p className="text-[8px] text-[#0D2B18] leading-tight">{r.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnouncementsScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Announcements</p>
        <p className="text-white/70 text-[7px]">From your department</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        {[
          { title: 'Exam Timetable Released', author: 'Course Rep', time: '2h ago', urgent: true },
          { title: 'Association Meeting Friday 4PM', author: 'Governor', time: '1d ago', urgent: false },
          { title: 'Lab Practical Rescheduled', author: 'Course Rep', time: '2d ago', urgent: false },
        ].map(a => (
          <div key={a.title} className="bg-white rounded-md p-2 border border-gray-100">
            <div className="flex items-center gap-1 mb-0.5">
              {a.urgent && <span className="text-[5px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-semibold">URGENT</span>}
              <p className="text-[8px] font-semibold text-[#0D2B18] leading-tight">{a.title}</p>
            </div>
            <p className="text-[6px] text-gray-400">{a.author} · {a.time}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function IssuesScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Issues</p>
        <p className="text-white/70 text-[7px]">Submit & track</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        <div className="bg-[#0D5C2E] rounded-md p-2 text-center">
          <p className="text-white text-[8px] font-semibold">+ Submit New Issue</p>
        </div>
        {[
          { desc: 'Missing payment record', to: 'Financial Secretary', status: 'In Progress', color: '#3498DB' },
          { desc: 'Resource link broken', to: 'Course Rep', status: 'Resolved', color: '#2ECC71' },
        ].map(i => (
          <div key={i.desc} className="bg-white rounded-md p-1.5 border border-gray-100">
            <div className="flex justify-between items-start">
              <p className="text-[7px] font-medium text-[#0D2B18] leading-tight flex-1 mr-1">{i.desc}</p>
              <span className="text-[5px] font-semibold px-1 py-0.5 rounded-full shrink-0" style={{ color: i.color, backgroundColor: i.color + '20' }}>
                {i.status}
              </span>
            </div>
            <p className="text-[6px] text-gray-400 mt-0.5">→ {i.to}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockTestScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Mock Tests</p>
        <p className="text-white/70 text-[7px]">Anatomy — Week 3</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        <div className="bg-white rounded-md p-2 border border-gray-100">
          <p className="text-[7px] text-gray-500 mb-1">Question 1 of 20</p>
          <p className="text-[8px] font-medium text-[#0D2B18] leading-tight">The femoral nerve arises from which lumbar roots?</p>
          <div className="mt-1.5 space-y-1">
            {['L1, L2, L3', 'L2, L3, L4', 'L3, L4, L5', 'L1, L2'].map((opt, i) => (
              <div key={opt} className={`rounded px-1.5 py-1 text-[7px] border ${i === 1 ? 'bg-[#0D5C2E] text-white border-[#0D5C2E]' : 'border-gray-200 text-gray-600'}`}>
                {opt}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-md px-2 py-1 border border-gray-100 flex justify-between items-center">
          <p className="text-[7px] text-gray-500">Score so far</p>
          <p className="text-[9px] font-bold text-[#0D5C2E]">8/10</p>
        </div>
      </div>
    </div>
  )
}

function LeaderboardScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F5FAF7]">
      <div className="bg-[#0D5C2E] px-3 py-2.5">
        <p className="text-white text-[9px] font-semibold">Leaderboard</p>
        <p className="text-white/70 text-[7px]">This week's top scorers</p>
      </div>
      <div className="p-2 flex-1 space-y-1.5 overflow-hidden">
        {[
          { rank: '🥇', name: 'Chioma A.', score: '94%', you: false },
          { rank: '🥈', name: 'Emeka O.', score: '91%', you: false },
          { rank: '🥉', name: 'Fatima I.', score: '88%', you: false },
          { rank: '4', name: 'You', score: '85%', you: true },
        ].map(l => (
          <div key={l.name} className={`rounded-md px-2 py-1.5 border flex items-center gap-2 ${l.you ? 'bg-[#0D5C2E]/10 border-[#0D5C2E]/30' : 'bg-white border-gray-100'}`}>
            <span className="text-[10px]">{l.rank}</span>
            <p className={`text-[8px] flex-1 font-medium ${l.you ? 'text-[#0D5C2E]' : 'text-[#0D2B18]'}`}>{l.name}</p>
            <p className="text-[8px] font-bold text-[#0D5C2E]">{l.score}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Slide definitions ────────────────────────────────────────────────────────

const slides = [
  {
    bg: 'from-[#0D5C2E] to-[#1A7A42]',
    tag: 'Welcome',
    title: 'Your PreMed Life, Organised',
    description: 'PreMed Connect is the official digital hub for pre-medical students — everything you need in one place, accessible from any device.',
    screen: <DashboardScreen />,
  },
  {
    bg: 'from-[#0D5C2E] to-[#0A4A25]',
    tag: 'Payments',
    title: 'Never Miss a Payment Deadline',
    description: 'View all departmental bills, track your payment status, and pay fees directly through the platform. No more guessing what you owe.',
    screen: <PaymentsScreen />,
  },
  {
    bg: 'from-[#145E35] to-[#0D5C2E]',
    tag: 'Resources',
    title: 'All Study Materials in One Place',
    description: 'Access lecture notes, past questions, slides, and departmental resources uploaded by your course rep — available anytime, anywhere.',
    screen: <ResourcesScreen />,
  },
  {
    bg: 'from-[#0D5C2E] to-[#1E6B3A]',
    tag: 'Announcements',
    title: 'Stay Informed in Real-Time',
    description: 'Receive announcements from your course rep and governor the moment they are posted. Never miss an important update again.',
    screen: <AnnouncementsScreen />,
  },
  {
    bg: 'from-[#0A4A25] to-[#0D5C2E]',
    tag: 'Issues',
    title: 'Your Voice Matters',
    description: 'Submit concerns directly to your course rep, assistant rep, governor, or financial secretary. Track the status of every issue you raise.',
    screen: <IssuesScreen />,
  },
  {
    bg: 'from-[#0D5C2E] to-[#12703A]',
    tag: 'Mock Tests',
    title: 'Prepare for Exams with Confidence',
    description: 'Take department mock tests, get instant scores, and compete on the leaderboard. Know exactly how prepared you are before exam day.',
    screen: <MockTestScreen />,
  },
  {
    bg: 'from-[#1A7A42] to-[#0D5C2E]',
    tag: 'Leaderboard',
    title: 'Compete and Excel',
    description: 'See where you rank among your peers each week. PreMed Connect turns studying into friendly competition that pushes everyone forward.',
    screen: <LeaderboardScreen />,
  },
]

// ── Phone mockup wrapper ─────────────────────────────────────────────────────

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[160px] sm:w-[190px] lg:w-[210px]">
      {/* Outer shell */}
      <div className="relative rounded-[2.5rem] border-[5px] border-[#1a1a1a] bg-[#1a1a1a] shadow-2xl overflow-hidden"
           style={{ aspectRatio: '9/19' }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1a1a1a] rounded-b-xl z-10" />
        {/* Screen */}
        <div className="absolute inset-[3px] rounded-[2rem] overflow-hidden bg-white mt-3">
          {children}
        </div>
      </div>
      {/* Side button */}
      <div className="absolute right-[-9px] top-20 w-[5px] h-10 bg-[#1a1a1a] rounded-r-md" />
      <div className="absolute left-[-9px] top-16 w-[5px] h-7 bg-[#1a1a1a] rounded-l-md" />
      <div className="absolute left-[-9px] top-28 w-[5px] h-7 bg-[#1a1a1a] rounded-l-md" />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function Onboarding() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const navigate = useNavigate()

  const slide = slides[current]
  const isLast = current === slides.length - 1

  const go = (next: number) => {
    setDirection(next > current ? 1 : -1)
    setCurrent(next)
  }

  const goNext = () => {
    if (isLast) { navigate('/login'); return }
    go(current + 1)
  }

  const goPrev = () => { if (current > 0) go(current - 1) }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ── Left panel — coloured with phone ── */}
      <div className={`relative flex-1 bg-gradient-to-br ${slide.bg} flex items-center justify-center transition-all duration-700 py-10 lg:py-0`}>
        {/* Skip button */}
        <button
          onClick={() => navigate('/login')}
          className="absolute top-5 right-5 text-white/70 hover:text-white text-sm font-medium transition-colors z-10"
        >
          Skip
        </button>

        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <PhoneMockup>{slide.screen}</PhoneMockup>
          </motion.div>
        </AnimatePresence>

        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-[-40px] right-[-40px] w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* ── Right panel — white with text ── */}
      <div className="flex flex-col justify-between bg-white w-full lg:w-[420px] xl:w-[480px] shrink-0 px-8 py-10 sm:px-12">

        <div />

        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="space-y-4"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand-primary bg-brand-pale px-3 py-1 rounded-full">
              {slide.tag}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-text leading-tight">
              {slide.title}
            </h1>
            <p className="text-brand-grey leading-relaxed text-sm sm:text-base">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-6 mt-10">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 h-2 bg-brand-primary'
                    : 'w-2 h-2 bg-brand-border hover:bg-brand-grey'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={current === 0}
              className="text-brand-grey hover:text-brand-text disabled:opacity-0"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <Button
              onClick={goNext}
              className="bg-brand-primary hover:bg-brand-secondary text-white rounded-full px-6"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
