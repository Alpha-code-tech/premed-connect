/** UUID v4 pattern — only format accepted for IDs */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** RFC 5321 length + basic structure check */
export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
  )
}

/** Strip null bytes and cap length */
export function safeText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/\0/g, '')
    .slice(0, maxLength)
    .trim()
}
