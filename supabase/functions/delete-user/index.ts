import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
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
    .maybeSingle()

  if (!existing) {
    await admin.from('rate_limits').insert({ user_id: userId, action, request_count: 1, window_start: new Date().toISOString() })
    return true
  }
  if (existing.window_start < windowStart) {
    await admin.from('rate_limits').update({ request_count: 1, window_start: new Date().toISOString() }).eq('id', existing.id)
    return true
  }
  if (existing.request_count >= maxRequests) return false
  await admin.from('rate_limits').update({ request_count: existing.request_count + 1 }).eq('id', existing.id)
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Validate caller is a developer
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (callerProfile?.role !== 'developer') {
      return new Response(JSON.stringify({ error: 'Forbidden: developer role required' }), {
        status: 403,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: max 20 deletions per hour per developer
    const allowed = await checkRateLimit(supabaseAdmin, caller.id, 'delete-user', 20, 60)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 20 deletions per hour.' }), {
        status: 429,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Prevent deleting other developers
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single()
    if (targetProfile?.role === 'developer') {
      return new Response(JSON.stringify({ error: 'Cannot delete another developer account' }), {
        status: 403,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Delete profile first (FK constraint), then auth user
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
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
