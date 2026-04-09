import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import {
  Menu, X, BookOpen, CreditCard, ClipboardList,
  Bell, FileText, FlaskConical, ShieldCheck,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

// ── Navbar ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'The Visionaries', href: '#visionaries' },
]

function Navbar() {
  const [open, setOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const { scrollYProgress } = useScroll()

  React.useEffect(() => {
    const unsub = scrollYProgress.on('change', v => setScrolled(v > 0.02))
    return unsub
  }, [scrollYProgress])

  return (
    <header className="fixed top-0 z-30 w-full pt-2">
      <nav
        data-state={open ? 'active' : undefined}
        className="group mx-auto max-w-7xl px-6 lg:px-12"
      >
        <div className={cn(
          'flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300',
          scrolled ? 'bg-white/80 shadow-md backdrop-blur-xl border border-white/30' : 'bg-transparent'
        )}>
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-brand-text text-lg">PreMed Connect</span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 text-sm lg:flex">
            {NAV_LINKS.map(l => (
              <li key={l.label}>
                <a href={l.href} className="text-brand-grey hover:text-brand-primary transition-colors font-medium">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 lg:flex">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-brand-primary hover:bg-brand-secondary">
              <Link to="/request-access">Request Access</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className="relative z-20 block p-2 lg:hidden"
          >
            {open
              ? <X className="h-5 w-5 text-brand-text" />
              : <Menu className="h-5 w-5 text-brand-text" />
            }
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="mx-0 mt-2 rounded-2xl border border-brand-border bg-white p-6 shadow-xl lg:hidden">
            <ul className="space-y-4 text-sm mb-6">
              {NAV_LINKS.map(l => (
                <li key={l.label}>
                  <a href={l.href} onClick={() => setOpen(false)}
                    className="text-brand-grey hover:text-brand-primary font-medium">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/login" onClick={() => setOpen(false)}>Sign In</Link>
              </Button>
              <Button asChild className="rounded-full bg-brand-primary hover:bg-brand-secondary">
                <Link to="/request-access" onClick={() => setOpen(false)}>Request Access</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0D2B18] via-[#0D5C2E] to-[#1a7a40] flex items-center">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 lg:px-12 lg:py-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80 mb-6 border border-white/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Your all-in-one student portal
          </span>

          <h1 className="text-5xl font-bold text-white leading-tight md:text-6xl xl:text-7xl">
            Welcome to <br />
            <span className="text-[#7FFFC4]">PreMed Connect</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/70 leading-relaxed">
            The official digital hub for pre-medical students — manage payments,
            access resources, take mock exams, raise issues, and stay informed,
            all in one place.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"
              className="rounded-full bg-white text-brand-primary hover:bg-white/90 font-semibold px-8">
              <Link to="/login">Sign In to Portal</Link>
            </Button>
            <Button asChild size="lg"
              className="rounded-full bg-white/15 border border-white/40 text-white hover:bg-white/25 px-8">
              <a href="#features">Explore Features</a>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: CreditCard,
    title: 'Payment Management',
    description: 'Pay dues, view payment history, and download receipts — all from your dashboard.',
  },
  {
    icon: BookOpen,
    title: 'Study Resources',
    description: 'Access lecture notes, slides, PDFs, and links shared by your course representatives.',
  },
  {
    icon: FlaskConical,
    title: 'Mock Exams',
    description: 'Prepare for your exams with timed practice tests and instant result reviews.',
  },
  {
    icon: ClipboardList,
    title: 'Issue Reporting',
    description: 'Submit and track issues directly to your course rep, governor, or financial secretary.',
  },
  {
    icon: Bell,
    title: 'Announcements & Notifications',
    description: 'Stay updated with real-time announcements from your department leadership.',
  },
  {
    icon: FileText,
    title: 'Timetable & Results',
    description: 'View your class timetable and access your academic results all in one place.',
  },
]

function Features() {
  return (
    <section id="features" className="bg-white py-24 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-brand-primary font-semibold text-sm uppercase tracking-widest">What we offer</span>
          <h2 className="mt-3 text-4xl font-bold text-brand-text">Everything you need, in one portal</h2>
          <p className="mt-4 text-brand-grey max-w-xl mx-auto">
            PreMed Connect brings together all the tools pre-medical students need to thrive academically and administratively.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-brand-border bg-brand-pale p-6 hover:shadow-md transition-shadow"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10">
                <f.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <h3 className="font-semibold text-brand-text mb-2">{f.title}</h3>
              <p className="text-sm text-brand-grey leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Departments ticker ─────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Human Anatomy', 'Physiology', 'Biochemistry',
  'Pharmacology', 'Microbiology', 'Pathology',
  'Nursing (NACON)', 'Community Health',
]

function DepartmentsTicker() {
  return (
    <section className="bg-brand-pale border-y border-brand-border py-5 overflow-hidden">
      <div className="relative">
        <InfiniteSlider speed={35} gap={64}>
          {DEPARTMENTS.map(dept => (
            <span key={dept} className="text-sm font-medium text-brand-grey whitespace-nowrap">
              {dept}
            </span>
          ))}
        </InfiniteSlider>
        <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-24" direction="right" blurIntensity={0.6} />
        <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-24" direction="left" blurIntensity={0.6} />
      </div>
    </section>
  )
}

// ── Visionaries ───────────────────────────────────────────────────────────────

const VISIONARIES = [
  // Leadership first
  { name: 'Raji Ahmed Ajani',           role: 'PreMed Governor',                    image: '/executives/Raji Ahmed Ajani PreMed Governor.jpg' },
  { name: 'Victoria Eniolorunda',        role: 'PreMed Deputy Governor',             image: '/executives/Victoria Eniolorunda Premed Deputy Governor.jpg' },
  // Course reps & ACRs alphabetically by last name
  { name: 'Abigail Ayomide',            role: 'Course Representative — Pharmacology', image: '/executives/Abigail Ayomide Pharmacology CR.jpg' },
  { name: 'Adeagbo David',              role: 'Asst. Course Rep — Nursing',          image: '/executives/Adeagbo David Nursing ACR.jpg' },
  { name: 'Badmus Eniola',              role: 'Course Representative — Anatomy',     image: '/executives/Badmus Eniola Anatomy CR.jpg' },
  { name: 'Fred Praise Gold',           role: 'Asst. Course Rep — Physiology',       image: '/executives/Fred Praise Gold Physiology ACR.jpg' },
  { name: 'Kennis Kalu Dede',           role: 'Course Representative — MBBS',        image: '/executives/Kennis Kalu Dede MBBS CR.jpg' },
  { name: 'Michael Favour Chiamaka',    role: 'Course Representative — Radiography', image: '/executives/Michael Favour Chiamaka Radiography CR.jpg' },
  { name: 'Niyi-Odewale Seyifunmi',     role: 'Course Representative — Physiotherapy', image: '/executives/Niyi-Odewale Seyifunmi Physiotherapy CR.jpg' },
  { name: 'Qasim Munirat Adedoyin',     role: 'Asst. Course Rep — Pharmacology',     image: '/executives/Qasim Munirat Adedoyin ACR Pharmacology.jpg' },
  { name: 'Solomon Uduak',              role: 'Course Representative — Nursing (NACON)', image: '/executives/Solomon Uduak Nursing (NACON) CR.jpg' },
]

function Visionaries() {
  const [index, setIndex] = React.useState(0)
  const [direction, setDirection] = React.useState(1)
  const total = VISIONARIES.length
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = React.useCallback((next: number) => {
    setDirection(next > index || (index === total - 1 && next === 0) ? 1 : -1)
    setIndex(next)
  }, [index, total])

  const prev = () => go((index - 1 + total) % total)
  const next = () => go((index + 1) % total)

  // Auto-advance every 4 s; reset on manual nav
  React.useEffect(() => {
    timerRef.current = setTimeout(() => go((index + 1) % total), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [index, go, total])

  // Build the 3 visible indices (center = active)
  const indices = [-1, 0, 1].map(offset => (index + offset + total) % total)

  return (
    <section id="visionaries" className="bg-white py-24 px-6 lg:px-12 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-brand-primary font-semibold text-sm uppercase tracking-widest">Leadership</span>
          <h2 className="mt-3 text-4xl font-bold text-brand-text">The Visionaries</h2>
          <p className="mt-4 text-brand-grey max-w-xl mx-auto">
            Meet the dedicated student leaders driving the PreMed Connect initiative and shaping the future of student life.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative flex items-center gap-4">
          {/* Prev button */}
          <button
            onClick={prev}
            className="hidden sm:flex shrink-0 h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white shadow-sm hover:bg-brand-pale transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5 text-brand-text" />
          </button>

          {/* Cards */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-stretch justify-center gap-4">
              {indices.map((vIdx, pos) => {
                const v = VISIONARIES[vIdx]
                const isCenter = pos === 1
                return (
                  <motion.div
                    key={vIdx}
                    layout
                    animate={{
                      scale: isCenter ? 1 : 0.88,
                      opacity: isCenter ? 1 : 0.5,
                    }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className={cn(
                      'rounded-2xl border border-brand-border overflow-hidden bg-white cursor-pointer transition-shadow',
                      isCenter ? 'shadow-xl' : 'shadow-sm hidden sm:block',
                    )}
                    style={{ flex: isCenter ? '0 0 340px' : '0 0 260px' }}
                    onClick={() => !isCenter && go(vIdx)}
                  >
                    <div className={cn(
                      'overflow-hidden bg-gradient-to-br from-brand-pale to-brand-border',
                      isCenter ? 'h-80' : 'h-64',
                    )}>
                      <img
                        src={v.image}
                        alt={v.name}
                        className="h-full w-full object-cover object-top"
                        draggable={false}
                      />
                    </div>
                    <div className={cn('p-4 text-center', isCenter ? 'p-5' : '')}>
                      <h3 className={cn('font-bold text-brand-text', isCenter ? 'text-lg' : 'text-sm')}>{v.name}</h3>
                      <p className={cn('font-medium text-brand-primary mt-1', isCenter ? 'text-sm' : 'text-xs')}>{v.role}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={next}
            className="hidden sm:flex shrink-0 h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white shadow-sm hover:bg-brand-pale transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5 text-brand-text" />
          </button>
        </div>

        {/* Mobile prev/next */}
        <div className="flex justify-center gap-3 mt-6 sm:hidden">
          <button onClick={prev} className="h-9 w-9 flex items-center justify-center rounded-full border border-brand-border bg-white shadow-sm" aria-label="Previous">
            <ChevronLeft className="h-4 w-4 text-brand-text" />
          </button>
          <button onClick={next} className="h-9 w-9 flex items-center justify-center rounded-full border border-brand-border bg-white shadow-sm" aria-label="Next">
            <ChevronRight className="h-4 w-4 text-brand-text" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {VISIONARIES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'rounded-full transition-all duration-300',
                i === index
                  ? 'bg-brand-primary w-6 h-2'
                  : 'bg-brand-border w-2 h-2',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#0D2B18] text-white/60 py-10 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary">
            <FlaskConical className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">PreMed Connect</span>
        </div>
        <p className="text-xs text-center">© {new Date().getFullYear()} PreMed Connect. All rights reserved.</p>
        <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors">
          Student Portal →
        </Link>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <DepartmentsTicker />
      <Features />
      <Visionaries />
      <Footer />
    </div>
  )
}
