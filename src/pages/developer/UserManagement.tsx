import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { generatePassword } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ROLE_LABELS } from '@/lib/constants'
import type { UserProfile, UserRole } from '@/types'

interface NewUserForm {
  full_name: string
  email: string
  department_id: string
  role: string
  student_id: string
}

interface CreatedCredentials {
  password: string
  email: string
}

const PAGE_SIZE = 20

async function invokeFn(name: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const { error } = await supabase.functions.invoke(name, {
    body,
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  })
  if (error) {
    let message = error.message
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json()
        message = body.error || message
      } catch { /* ignore parse error */ }
    }
    throw new Error(message)
  }
}

export default function DeveloperUserManagement() {
  const { profile: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState<NewUserForm>({
    full_name: '',
    email: '',
    department_id: '',
    role: 'student',
    student_id: '',
  })
  const [createdPassword, setCreatedPassword] = useState<CreatedCredentials | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [page, setPage] = useState(0)

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
  })

  const { data: users, isLoading } = useQuery<UserProfile[]>({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
  })

  const deptMap = Object.fromEntries((departments || []).map(d => [d.id, d.name]))

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
      if (error) throw new Error(error.message)
      await supabase.from('audit_log').insert({
        action_type: 'role_changed',
        performed_by: currentUser!.id,
        affected_entity_type: 'profile',
        affected_entity_id: userId,
        metadata: { new_role: role },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      toast({ title: 'Role updated' })
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await invokeFn('delete-user', { user_id: userId })
      await supabase.from('audit_log').insert({
        action_type: 'user_deleted',
        performed_by: currentUser!.id,
        affected_entity_type: 'profile',
        affected_entity_id: userId,
        metadata: {},
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['developer-stats'] })
      setDeleteTarget(null)
      toast({ title: 'User deleted' })
    },
    onError: (e: Error) =>
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  })

  const createUserMutation = useMutation({
    mutationFn: async (): Promise<CreatedCredentials> => {
      const password = generatePassword()
      await invokeFn('create-user', {
        email: newUser.email,
        password,
        full_name: newUser.full_name,
        department_id: newUser.department_id || null,
        role: newUser.role,
        student_id: newUser.student_id || null,
      })
      await supabase.from('audit_log').insert({
        action_type: 'user_created',
        performed_by: currentUser!.id,
        affected_entity_type: 'profile',
        affected_entity_id: null,
        metadata: { email: newUser.email, role: newUser.role },
      })
      return { password, email: newUser.email }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['developer-stats'] })
      setCreateOpen(false)
      setCreatedPassword(data)
      setNewUser({ full_name: '', email: '', department_id: '', role: 'student', student_id: '' })
      toast({ title: 'User created successfully' })
    },
    onError: (e: Error) =>
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' }),
  })

  const allUsers = users ?? []

  const filtered = allUsers.filter((u) => {
    const term = search.toLowerCase()
    const matchSearch =
      !search ||
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleCreateClose = () => {
    setCreateOpen(false)
    setNewUser({ full_name: '', email: '', department_id: '', role: 'student', student_id: '' })
  }

  const handlePasswordDialogClose = () => {
    setCreatedPassword(null)
    setShowPassword(false)
  }

  const needsDepartment = ['student', 'course_rep', 'assistant_course_rep'].includes(newUser.role)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">User Management</h1>
          <p className="text-brand-grey mt-1">Manage all platform users and their roles</p>
        </div>
        <Button
          className="bg-brand-primary hover:bg-brand-secondary"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Create Account
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
          <Input
            className="pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-brand-pale border-b border-brand-border">
                <tr>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Department</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-brand-grey font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-brand-grey">
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginated.map((user) => (
                    <tr key={user.id} className="hover:bg-brand-pale/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-text">{user.full_name}</td>
                      <td className="px-4 py-3 text-brand-grey">{user.email}</td>
                      <td className="px-4 py-3 text-brand-grey">
                        {user.department_id ? (deptMap[user.department_id] || user.department_id) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {user.id !== currentUser?.id ? (
                          <Select
                            defaultValue={user.role as UserRole}
                            onValueChange={(role) =>
                              updateRoleMutation.mutate({ userId: user.id, role })
                            }
                          >
                            <SelectTrigger className="h-8 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[user.role] ?? user.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-brand-grey">
              <span>
                Showing {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id) }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={handleCreateClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Account</DialogTitle>
            <DialogDescription>
              A temporary password will be generated and shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-brand-text">Full Name</label>
              <Input
                className="mt-1"
                placeholder="John Doe"
                value={newUser.full_name}
                onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-text">Email</label>
              <Input
                className="mt-1"
                type="email"
                placeholder="user@gmail.com"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-text">Role</label>
              <Select
                value={newUser.role}
                onValueChange={(role) => setNewUser((p) => ({ ...p, role, student_id: '', department_id: '' }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsDepartment && (
              <div>
                <label className="text-sm font-medium text-brand-text">Department</label>
                <Select
                  value={newUser.department_id}
                  onValueChange={(v) => setNewUser((p) => ({ ...p, department_id: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments || []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {newUser.role === 'student' && (
              <div>
                <label className="text-sm font-medium text-brand-text">
                  Matriculation Number <span className="text-brand-grey font-normal">(optional)</span>
                </label>
                <Input
                  className="mt-1"
                  placeholder="e.g. MLS/2021/001"
                  value={newUser.student_id}
                  onChange={(e) => setNewUser((p) => ({ ...p, student_id: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCreateClose}>Cancel</Button>
            <Button
              className="bg-brand-primary hover:bg-brand-secondary"
              disabled={
                createUserMutation.isPending ||
                !newUser.full_name.trim() ||
                !newUser.email.trim() ||
                (needsDepartment && !newUser.department_id)
              }
              onClick={() => createUserMutation.mutate()}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated password reveal dialog */}
      <Dialog open={!!createdPassword} onOpenChange={handlePasswordDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Created</DialogTitle>
            <DialogDescription>
              Share these credentials with the user. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-brand-grey mb-1">Email</p>
              <p className="font-medium text-brand-text">{createdPassword?.email}</p>
            </div>
            <div>
              <p className="text-xs text-brand-grey mb-1">Temporary Password</p>
              <div className="flex items-center gap-2">
                <code
                  className={`flex-1 bg-brand-pale border border-brand-border rounded px-3 py-2 text-sm font-mono transition-all select-none ${
                    showPassword ? '' : 'blur-sm'
                  }`}
                >
                  {createdPassword?.password}
                </code>
                <Button variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy password"
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassword?.password ?? '')
                    toast({ title: 'Password copied to clipboard' })
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
              This password will not be shown again. The user will be prompted to change it on first login.
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-brand-primary hover:bg-brand-secondary" onClick={handlePasswordDialogClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
