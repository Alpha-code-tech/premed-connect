import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkIpRateLimit, getClientIp } from '../_shared/rate-limit.ts'
import { isValidUUID } from '../_shared/validate.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const isAllowed =
    origin === APP_URL ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000' ||
    origin.endsWith('.vercel.app')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : APP_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const ip = getClientIp(req)

    // IP rate limit: 5 submissions per hour per IP (prevents spam bots)
    const allowed = await checkIpRateLimit(supabaseAdmin, ip, 'submit-access-request', 5, 60)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests from this network. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { full_name, department_id, matriculation_number, gmail, _h, _t } = body

    // Honeypot: legitimate browsers leave _h empty; bots fill it in
    if (_h) {
      // Return fake success to confuse bots — do not reveal the check
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Timing check: reject if form was submitted in under 3 seconds (bot speed)
    if (typeof _t === 'number' && Date.now() - _t < 3000) {
      return new Response(
        JSON.stringify({ error: 'Submission rejected. Please try again.' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Field presence validation
    if (!full_name || !department_id || !matriculation_number || !gmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Validate department_id is a real UUID (prevents filter injection)
    if (!isValidUUID(department_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid department selection' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Validate Gmail domain
    const emailStr = String(gmail).trim().toLowerCase()
    if (!emailStr.endsWith('@gmail.com')) {
      return new Response(
        JSON.stringify({ error: 'A Gmail address is required (@gmail.com)' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Input length caps (prevent oversized payloads)
    const sanitized = {
      full_name: String(full_name).trim().slice(0, 100),
      department_id: String(department_id).slice(0, 36), // UUID length
      matriculation_number: String(matriculation_number).trim().slice(0, 50),
      gmail: emailStr.slice(0, 100),
      status: 'pending' as const,
    }

    // Duplicate check: reject if a pending or approved request exists for this email
    const { data: existing } = await supabaseAdmin
      .from('access_requests')
      .select('id, status')
      .eq('gmail', sanitized.gmail)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existing) {
      const message =
        existing.status === 'approved'
          ? 'An account already exists for this email address.'
          : 'A pending request already exists for this email address.'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 409, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('access_requests')
      .insert(sanitized)

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to submit request. Please try again.' }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
