import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'

const passwordSchema = z.object({
  new_password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type PasswordData = z.infer<typeof passwordSchema>

export default function StudentProfile() {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const { data: department } = useQuery({
    queryKey: ['department', profile?.department_id],
    enabled: !!profile?.department_id,
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('name').eq('id', profile!.department_id!).single()
      return data
    },
  })

  const form = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PNG or JPG image.', variant: 'destructive' })
      e.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Avatar must be under 2MB.', variant: 'destructive' })
      e.target.value = ''
      return
    }
    setUploadingAvatar(true)
    const path = `avatars/${profile.id}-${Date.now()}.${file.type.split('/')[1]}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
      await refreshProfile()
      toast({ title: 'Avatar updated successfully' })
    }
    setUploadingAvatar(false)
  }

  const onPasswordSubmit = async (data: PasswordData) => {
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: data.new_password })
    if (error) {
      toast({ title: 'Password update failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Password changed successfully' })
      form.reset()
    }
    setChangingPassword(false)
  }

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Profile</h1>
        <p className="text-brand-grey mt-1 text-sm">Manage your account settings</p>
      </div>

      <div className="bg-white rounded-lg border border-brand-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-brand-pale text-brand-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center cursor-pointer hover:bg-brand-secondary transition-colors">
              <Camera className="h-3.5 w-3.5 text-white" />
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-brand-text">{profile?.full_name}</h2>
            <p className="text-brand-grey text-sm">{profile?.email}</p>
            <div className="pt-2 space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-brand-grey w-28">Department:</span>
                <span className="text-brand-text font-medium">{department?.name || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-grey w-28">Student ID:</span>
                <span className="text-brand-text font-medium">{profile?.student_id || 'N/A'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-brand-grey w-28">Role:</span>
                <span className="text-brand-text font-medium capitalize">{profile?.role.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        </div>
        {uploadingAvatar && (
          <p className="mt-3 text-xs text-brand-grey flex items-center gap-1">
            <span className="h-3 w-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            Uploading avatar...
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-brand-border p-4 sm:p-6">
        <h3 className="font-semibold text-brand-text mb-4">Change Password</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
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
            <Button type="submit" className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" disabled={changingPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
