import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const requestSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  department_id: z.string().min(1, 'Please select your department'),
  matriculation_number: z.string().min(5, 'Please enter a valid matriculation number'),
  gmail: z.string().email('Please enter a valid Gmail address').refine(v => v.endsWith('@gmail.com'), 'Must be a Gmail address'),
})

type RequestFormData = z.infer<typeof requestSchema>

interface Department {
  id: string
  name: string
}

export default function RequestAccess() {
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const loadTimeRef = useRef(Date.now())
  const { toast } = useToast()

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name').then(({ data }) => {
      if (data) setDepartments(data)
    })
  }, [])

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { full_name: '', department_id: '', matriculation_number: '', gmail: '' },
  })

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true)
    try {
      const { error: fnError } = await supabase.functions.invoke('submit-access-request', {
        body: {
          full_name: data.full_name,
          department_id: data.department_id,
          matriculation_number: data.matriculation_number,
          gmail: data.gmail,
          _h: '',          // Honeypot field — always empty for real users
          _t: loadTimeRef.current, // Page load timestamp for bot timing detection
        },
      })

      if (fnError) {
        let description = fnError.message
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (fnError as any).context
          const body = ctx instanceof Response
            ? await ctx.clone().json()
            : typeof ctx?.json === 'function' ? await ctx.json() : null
          if (body?.error) description = body.error
        } catch { /* ignore parse errors */ }
        toast({ title: 'Submission failed', description, variant: 'destructive' })
        return
      }

      setSubmitted(true)
    } catch {
      toast({ title: 'Submission failed', description: 'Could not submit your request. Please try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-brand-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-pale flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold text-brand-text mb-3">Request Received</h2>
          <p className="text-brand-grey leading-relaxed">
            Your request has been received. You will be granted access once your details are verified by the PreMed Connect team.
          </p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-brand-primary font-medium hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-text">Request Access</h1>
          <p className="text-brand-grey mt-1">Fill in your details to request a PreMed Connect account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="department_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select your department" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="matriculation_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Matriculation Number</FormLabel>
                  <FormControl><Input placeholder="e.g. MLS/2021/001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="gmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gmail Address</FormLabel>
                  <FormControl><Input type="email" placeholder="you@gmail.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-secondary" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</span> : 'Submit Request'}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center text-sm text-brand-grey">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-primary font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
