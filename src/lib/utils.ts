import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function generatePassword(): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const array = new Uint8Array(12)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((byte) => charset[byte % charset.length])
    .join('')
}

export function getDaysRemaining(deadline: string): number {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getFileTypeIcon(fileType: string): string {
  const type = fileType.toLowerCase()
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('word') || type.includes('docx')) return 'doc'
  if (type.includes('powerpoint') || type.includes('pptx')) return 'ppt'
  if (type.includes('image') || type.includes('png') || type.includes('jpg')) return 'img'
  return 'file'
}

export function getMimeTypes(): Record<string, string[]> {
  return {
    PDF: ['application/pdf'],
    DOCX: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    PPTX: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    PNG: ['image/png'],
    JPG: ['image/jpeg'],
  }
}

export function validateMimeType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}
