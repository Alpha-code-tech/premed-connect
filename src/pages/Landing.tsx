import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import {
  Menu, X, BookOpen, CreditCard, ClipboardList,
  Bell, FileText, FlaskConical, Users, ShieldCheck,
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
            <Button asChild size="lg" variant="outline"
              className="rounded-full border-white/30 text-white hover:bg-white/10 px-8">
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
            <span key={dept} className="flex items-center gap-2 text-sm font-medium text-brand-grey whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
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

// TODO: Replace with real executives when photos and details are provided
const VISIONARIES: {
  name: string
  role: string
  department: string
  image: string
}[] = [
  // Example entry (replace with real data):
  // {
  //   name: 'Adebayo Johnson',
  //   role: 'Governor',
  //   department: 'Human Anatomy',
  //   image: 'https://your-image-url.jpg',
  // },
]

function Visionaries() {
  return (
    <section id="visionaries" className="bg-white py-24 px-6 lg:px-12">
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

        {VISIONARIES.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-brand-border bg-brand-pale p-16 text-center">
            <Users className="h-10 w-10 text-brand-grey mx-auto mb-4" />
            <p className="text-brand-grey font-medium">Executive profiles coming soon</p>
            <p className="text-sm text-brand-grey mt-1">Provide names, roles, departments and photos to populate this section.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {VISIONARIES.map((v, i) => (
              <motion.div
                key={v.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-brand-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-64 overflow-hidden bg-gradient-to-br from-brand-pale to-brand-border">
                  <img
                    src={v.image}
                    alt={v.name}
                    className="h-full w-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-brand-text">{v.name}</h3>
                  <p className="text-sm font-medium text-brand-primary mt-0.5">{v.role}</p>
                  <p className="text-xs text-brand-grey mt-1">{v.department}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
