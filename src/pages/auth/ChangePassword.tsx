import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROLE_ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

const passwordSchema = z.object({
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function ChangePassword() {
  const [isLoading, setIsLoading] = useState(false)
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password: data.new_password })

    if (updateError) {
      toast({ title: 'Password update failed', description: updateError.message, variant: 'destructive' })
      setIsLoading(false)
      return
    }

    if (profile) {
      const route = ROLE_ROUTES[profile.role] || '/login'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', profile.id)

      if (profileError) {
        toast({ title: 'Error', description: profileError.message, variant: 'destructive' })
        setIsLoading(false)
        return
      }

      // Patch local state immediately so ProtectedRoute doesn't redirect back
      updateProfile({ password_changed: true })
      toast({ title: 'Password changed successfully' })
      navigate(route, { replace: true })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">Set Your Password</h1>
          <p className="text-brand-grey mt-1">You need to set a new password before continuing</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-brand-border p-8">
          <div className="mb-6 p-4 bg-brand-pale rounded-lg border border-brand-border text-sm text-brand-grey">
            <p className="font-medium text-brand-text mb-1">Password requirements:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>At least 8 characters</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (!@#$%...)</li>
            </ul>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="new_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="confirm_password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl><Input type="password" placeholder="Confirm new password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-secondary" disabled={isLoading}>
                {isLoading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</span> : 'Set Password & Continue'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
