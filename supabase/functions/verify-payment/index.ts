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

    // Verify caller is authenticated
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: max 20 payment verifications per hour per student
    const allowed = await checkRateLimit(supabaseAdmin, caller.id, 'verify-payment', 20, 60)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const { reference, payment_item_id, amount } = await req.json()
    if (!reference || !payment_item_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Verify payment with Paystack server-side
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      return new Response(JSON.stringify({ error: 'Payment verification not configured' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    })
    const verifyData = await verifyRes.json()

    if (!verifyRes.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Payment not verified by Paystack' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Confirm amount matches (Paystack stores in kobo)
    const paidAmountNaira = verifyData.data.amount / 100
    if (paidAmountNaira !== amount) {
      return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Prevent duplicate processing — check if this reference was already recorded
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (existing) {
      // Already processed — idempotent success
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Update existing pending record or insert new one
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'successful',
        paystack_reference: reference,
        receipt_url: reference,
        amount,
      })
      .eq('student_id', caller.id)
      .eq('payment_item_id', payment_item_id)
      .select()

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    if (!updated || updated.length === 0) {
      // No existing record — insert fresh
      const { error: insertErr } = await supabaseAdmin.from('payments').insert({
        student_id: caller.id,
        payment_item_id,
        amount,
        status: 'successful',
        paystack_reference: reference,
        receipt_url: reference,
      })
      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
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
