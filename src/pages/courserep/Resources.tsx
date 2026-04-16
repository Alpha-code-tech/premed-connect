import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, File, FileText, Image, BookOpen, Link } from 'lucide-react'
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
import { formatFileSize, formatDateShort } from '@/lib/utils'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
}
const MAX_SIZE = 20 * 1024 * 1024

export default function CourseRepResources() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    visibility: 'department' as 'all' | 'department',
    linkUrl: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['courserep-resources', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('department_id', profile!.department_id!)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (resource: { id: string; file_url: string; file_type: string }) => {
      const { error } = await supabase.from('resources').delete().eq('id', resource.id)
      if (error) throw error
      // Only delete from storage if it's a real file (not a link)
      if (resource.file_type !== 'LINK') {
        await supabase.storage.from('resources').remove([resource.file_url])
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courserep-resources'] })
      toast({ title: 'Resource deleted' })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES[file.type]) {
      toast({ title: 'Invalid file type', description: 'Allowed: PDF, DOCX, PPTX, PNG, JPG', variant: 'destructive' })
      return
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 20MB', variant: 'destructive' })
      return
    }
    setSelectedFile(file)
  }

  const resetDialog = () => {
    setForm({ title: '', description: '', subject: '', visibility: 'department', linkUrl: '' })
    setSelectedFile(null)
    setMode('file')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.subject.trim()) {
      toast({ title: 'Title and subject are required', variant: 'destructive' })
      return
    }
    if (mode === 'file' && !selectedFile) {
      toast({ title: 'Please select a file', variant: 'destructive' })
      return
    }
    if (mode === 'link') {
      if (!form.linkUrl.trim()) {
        toast({ title: 'Please enter a link URL', variant: 'destructive' })
        return
      }
      try { new URL(form.linkUrl) } catch {
        toast({ title: 'Invalid URL', description: 'Enter a valid URL starting with http:// or https://', variant: 'destructive' })
        return
      }
    }

    setUploading(true)
    try {
      let fileUrl: string
      let fileType: string

      if (mode === 'link') {
        fileUrl = form.linkUrl.trim()
        fileType = 'LINK'
      } else {
        const ext = selectedFile!.name.split('.').pop()
        const slug = profile!.department_id?.toLowerCase().replace(/\s+/g, '-') || 'general'
        const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('resources').upload(path, selectedFile!)
        if (uploadError) throw uploadError
        fileUrl = path
        fileType = ALLOWED_TYPES[selectedFile!.type] || 'FILE'
      }

      const { error: dbError } = await supabase.from('resources').insert({
        title: form.title,
        description: form.description || null,
        subject: form.subject,
        file_url: fileUrl,
        file_type: fileType,
        visibility: form.visibility,
        department_id: profile!.department_id,
        uploaded_by: profile!.id,
      })
      if (dbError) throw dbError

      queryClient.invalidateQueries({ queryKey: ['courserep-resources'] })
      toast({ title: mode === 'link' ? 'Link added successfully' : 'Resource uploaded successfully' })
      setUploadOpen(false)
      resetDialog()
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const getIcon = (type: string) => {
    if (type === 'PDF') return <FileText className="h-5 w-5 text-red-500" />
    if (type === 'PNG' || type === 'JPG') return <Image className="h-5 w-5 text-blue-500" />
    if (type === 'LINK') return <Link className="h-5 w-5 text-brand-primary" />
    return <File className="h-5 w-5 text-brand-grey" />
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Resources</h1>
          <p className="text-brand-grey mt-1 text-sm">Upload and manage department resources</p>
        </div>
        <Button className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Add Resource
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : resources?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <BookOpen className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No resources uploaded yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources?.map(r => (
            <div key={r.id} className="bg-white rounded-lg border border-brand-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-pale flex items-center justify-center shrink-0">
                  {getIcon(r.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-brand-text line-clamp-1">{r.title}</p>
                  <p className="text-xs text-brand-grey">{r.subject}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-brand-grey">
                <Badge variant="outline">{r.file_type === 'LINK' ? 'Link' : r.file_type}</Badge>
                <Badge variant="outline">{r.visibility}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-grey">{formatDateShort(r.created_at)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 h-7 text-xs"
                  onClick={() => deleteMutation.mutate({ id: r.id, file_url: r.file_url, file_type: r.file_type })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={open => { setUploadOpen(open); if (!open) resetDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-brand-border overflow-hidden">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'file' ? 'bg-brand-primary text-white' : 'bg-white text-brand-grey hover:bg-brand-pale'}`}
                onClick={() => setMode('file')}
              >
                Upload File
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'link' ? 'bg-brand-primary text-white' : 'bg-white text-brand-grey hover:bg-brand-pale'}`}
                onClick={() => setMode('link')}
              >
                Add Link
              </button>
            </div>

            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input className="mt-1" placeholder="Resource title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input className="mt-1" placeholder="e.g. Anatomy" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea className="mt-1 h-20 resize-none" placeholder="Optional description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select value={form.visibility} onValueChange={v => setForm(p => ({ ...p, visibility: v as 'all' | 'department' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">My Department Only</SelectItem>
                  <SelectItem value="all">All Students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'link' ? (
              <div>
                <label className="text-sm font-medium">Link URL *</label>
                <Input
                  className="mt-1"
                  placeholder="https://drive.google.com/..."
                  value={form.linkUrl}
                  onChange={e => setForm(p => ({ ...p, linkUrl: e.target.value }))}
                />
                <p className="text-xs text-brand-grey mt-1">Paste a Google Drive, YouTube, or any other link</p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">File * (PDF, DOCX, PPTX, PNG, JPG — max 20MB)</label>
                <div
                  className="mt-1 border-2 border-dashed border-brand-border rounded-lg p-4 text-center cursor-pointer hover:border-brand-accent transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-brand-text">{selectedFile.name}</p>
                      <p className="text-xs text-brand-grey mt-1">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-6 w-6 text-brand-grey mx-auto mb-1" />
                      <p className="text-sm text-brand-grey">Click to select file</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg" onChange={handleFileSelect} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setUploadOpen(false); resetDialog() }}>Cancel</Button>
            <Button
              className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary"
              onClick={handleSubmit}
              disabled={uploading || !form.title.trim() || !form.subject.trim() || (mode === 'file' && !selectedFile) || (mode === 'link' && !form.linkUrl.trim())}
            >
              {uploading ? 'Saving...' : mode === 'link' ? 'Add Link' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
