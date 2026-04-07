/**
 * Shared input validation and sanitization utilities.
 * Used across all forms, uploads, and query construction.
 */

/** UUID v4 — only format accepted for database IDs from untrusted sources */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Map MIME type → safe file extension.
 * Never derive the extension from the filename — the filename is user-controlled.
 */
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

export function mimeToExtension(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null
}

/**
 * Validate a file's MIME type and size.
 * Returns an error string, or null if the file is acceptable.
 */
export function validateFile(
  file: File,
  allowedMimeTypes: string[],
  maxBytes: number
): string | null {
  if (!allowedMimeTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedMimeTypes.map(m => MIME_TO_EXT[m] ?? m).join(', ').toUpperCase()}`
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    return `File exceeds ${mb}MB limit`
  }
  // Derived extension must match MIME type — catches renamed files
  const expectedExt = MIME_TO_EXT[file.type]
  if (expectedExt) {
    const nameLower = file.name.toLowerCase()
    const allowedExts =
      file.type === 'image/jpeg' ? ['jpg', 'jpeg'] : [expectedExt]
    const hasValidExt = allowedExts.some(ext => nameLower.endsWith(`.${ext}`))
    if (!hasValidExt) {
      return `File extension does not match its type (expected .${expectedExt})`
    }
  }
  return null
}

/**
 * Strip null bytes and non-printable control characters; cap at maxLength.
 * Use before every free-text field going into the database.
 */
export function safeText(value: string, maxLength: number): string {
  return value
    .replace(/\0/g, '')                              // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars (keep \t \n \r)
    .slice(0, maxLength)
    .trim()
}

/**
 * Sanitize a value for inclusion in a CSV cell.
 * - Escapes existing double quotes (RFC 4180)
 * - Prefixes formula-injection characters (=, +, -, @) with a tab
 *   to prevent spreadsheet applications from executing them.
 */
export function sanitizeCsvCell(value: string): string {
  const escaped = String(value).replace(/"/g, '""')
  return /^[=+\-@\t\r]/.test(escaped) ? `\t${escaped}` : escaped
}
