import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type AdminClient = ReturnType<typeof createClient>

/**
 * Extract the real client IP from request headers.
 * Checks Cloudflare, nginx, and generic proxy headers in priority order.
 */
export function getClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return 'unknown'
}

/**
 * Check rate limit by authenticated user ID.
 * Use for endpoints that require a valid session.
 */
export async function checkUserRateLimit(
  admin: AdminClient,
  userId: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { data: existing } = await admin
    .from('rate_limits')
    .select('id, request_count, window_start')
    .eq('user_id', userId)
    .eq('action', action)
    .is('ip_address', null)
    .maybeSingle()

  return upsertLimit(admin, existing, { user_id: userId, action }, maxRequests, windowStart)
}

/**
 * Check rate limit by IP address.
 * Use for unauthenticated endpoints (public forms, etc.).
 */
export async function checkIpRateLimit(
  admin: AdminClient,
  ip: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  if (ip === 'unknown') return true // Cannot determine IP — allow but log cautiously

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { data: existing } = await admin
    .from('rate_limits')
    .select('id, request_count, window_start')
    .eq('ip_address', ip)
    .eq('action', action)
    .is('user_id', null)
    .maybeSingle()

  return upsertLimit(admin, existing, { ip_address: ip, action }, maxRequests, windowStart)
}

/**
 * Check both user and IP rate limits in parallel.
 * Use for authenticated endpoints where IP-based abuse is also a concern.
 * Returns { allowed: false } if either limit is exceeded.
 */
export async function checkCombinedRateLimit(
  admin: AdminClient,
  userId: string,
  ip: string,
  action: string,
  userMax: number,
  ipMax: number,
  windowMinutes: number
): Promise<{ allowed: boolean; reason?: 'user' | 'ip' }> {
  const [userOk, ipOk] = await Promise.all([
    checkUserRateLimit(admin, userId, action, userMax, windowMinutes),
    ip !== 'unknown'
      ? checkIpRateLimit(admin, ip, `${action}:ip`, ipMax, windowMinutes)
      : Promise.resolve(true),
  ])

  if (!userOk) return { allowed: false, reason: 'user' }
  if (!ipOk) return { allowed: false, reason: 'ip' }
  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

type LimitRecord = { id: string; request_count: number; window_start: string } | null

async function upsertLimit(
  admin: AdminClient,
  existing: LimitRecord,
  identity: Record<string, string>,
  maxRequests: number,
  windowStart: string
): Promise<boolean> {
  if (!existing) {
    await admin.from('rate_limits').insert({
      ...identity,
      request_count: 1,
      window_start: new Date().toISOString(),
    })
    return true
  }

  // Window expired — reset counter
  if (existing.window_start < windowStart) {
    await admin
      .from('rate_limits')
      .update({ request_count: 1, window_start: new Date().toISOString() })
      .eq('id', existing.id)
    return true
  }

  if (existing.request_count >= maxRequests) return false

  await admin
    .from('rate_limits')
    .update({ request_count: existing.request_count + 1 })
    .eq('id', existing.id)
  return true
}
