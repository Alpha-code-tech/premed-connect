import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attemptCount, setAttemptCount] = useState(() => {
    const stored = sessionStorage.getItem('login_attempts')
    return stored ? parseInt(stored, 10) : 0
  })
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(() => {
    const stored = sessionStorage.getItem('login_lockout_until')
    return stored ? new Date(stored) : null
  })
  const { toast } = useToast()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const isLockedOut = lockoutUntil && new Date() < lockoutUntil

  const onSubmit = async (data: LoginFormData) => {
    if (isLockedOut) {
      const secondsLeft = Math.ceil((lockoutUntil!.getTime() - Date.now()) / 1000)
      toast({ title: 'Too many attempts', description: `Please wait ${secondsLeft} seconds before trying again.`, variant: 'destructive' })
      return
    }

    setIsLoading(true)
    let error: Error | null = null
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: data.email, password: data.password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        ),
      ])
      error = result.error
    } catch (err) {
      setIsLoading(false)
      if ((err as Error).message === 'timeout') {
        // The Supabase client holds an internal storage lock during session refresh.
        // If a previous page load left the lock stale (tab closed mid-refresh, network
        // hiccup, etc.), signInWithPassword queues behind it and never resolves.
        // Signing out locally clears the lock immediately — no network call needed.
        await supabase.auth.signOut({ scope: 'local' })
        toast({
          title: 'Sign-in timed out',
          description: 'A stale session was detected and cleared. Please try signing in again.',
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Connection error', description: 'Check your internet connection and try again.', variant: 'destructive' })
      }
      return
    }
    setIsLoading(false)

    if (!error) {
      sessionStorage.removeItem('login_attempts')
      sessionStorage.removeItem('login_lockout_until')
      return
    }

    const newCount = attemptCount + 1
    setAttemptCount(newCount)
    sessionStorage.setItem('login_attempts', String(newCount))
    if (newCount >= 5) {
      const lockout = new Date(Date.now() + 60000)
      setLockoutUntil(lockout)
      sessionStorage.setItem('login_lockout_until', lockout.toISOString())
      toast({ title: 'Account temporarily locked', description: 'Too many failed attempts. Please wait 1 minute before trying again.', variant: 'destructive' })
    } else {
      toast({ title: 'Login failed', description: 'Invalid email or password.', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-brand-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-primary flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold text-white">P</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">PreMed Connect</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Your unified portal for the PreMed Set — connecting students, resources, and opportunities across all ten health science departments.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-white/70">
            <div className="bg-white/10 rounded-lg p-3">Medical Laboratory Science</div>
            <div className="bg-white/10 rounded-lg p-3">Medicine and Surgery</div>
            <div className="bg-white/10 rounded-lg p-3">Pharmacy</div>
            <div className="bg-white/10 rounded-lg p-3">Radiography</div>
            <div className="bg-white/10 rounded-lg p-3">Anatomy</div>
            <div className="bg-white/10 rounded-lg p-3">Physiology</div>
            <div className="bg-white/10 rounded-lg p-3">Pharmacology</div>
            <div className="bg-white/10 rounded-lg p-3">Nursing</div>
            <div className="bg-white/10 rounded-lg p-3">Physiotherapy</div>
            <div className="bg-white/10 rounded-lg p-3">Dentistry</div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-brand-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <h1 className="text-2xl font-bold text-brand-text">PreMed Connect</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8">
            <h2 className="text-2xl font-bold text-brand-text mb-2">Welcome back</h2>
            <p className="text-brand-grey mb-6">Sign in to your account to continue</p>

            {isLockedOut && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Account temporarily locked due to too many failed attempts. Please wait before trying again.
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-grey hover:text-brand-text" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-secondary" disabled={isLoading || !!isLockedOut}>
                  {isLoading ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</span>
                  ) : (
                    <span className="flex items-center gap-2"><LogIn className="h-4 w-4" /> Sign in</span>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-brand-grey">
              Don't have an account?{' '}
              <Link to="/request-access" className="text-brand-primary font-medium hover:underline">
                Request Access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
