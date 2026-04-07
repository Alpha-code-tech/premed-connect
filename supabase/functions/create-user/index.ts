import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkCombinedRateLimit, getClientIp } from '../_shared/rate-limit.ts'
import { isValidEmail, isValidUUID, safeText } from '../_shared/validate.ts'

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

async function sendWelcomeEmail(
  resendApiKey: string,
  to: string,
  fullName: string,
  password: string,
  role: string,
  appUrl: string
) {
  const roleLabel: Record<string, string> = {
    student: 'Student',
    course_rep: 'Course Representative',
    assistant_course_rep: 'Assistant Course Rep',
    governor: 'Governor',
    financial_secretary: 'Financial Secretary',
    developer: 'Developer',
  }

  const body = {
    from: 'PreMed Connect <noreply@mail.premedconnect.xyz>',
    to: [to],
    subject: 'Your PreMed Connect Account is Ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0D2B18;">
        <div style="background: #0D5C2E; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">PreMed Connect</h1>
        </div>
        <div style="background: #F7FDF9; padding: 32px; border: 1px solid #B2DBC2; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hi <strong>${fullName}</strong>,</p>
          <p>Your PreMed Connect account has been created. You've been assigned the role of <strong>${roleLabel[role] ?? role}</strong>.</p>
          <p>Use the credentials below to sign in for the first time:</p>
          <div style="background: #E8F5ED; border: 1px solid #B2DBC2; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${to}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong>
              <code style="background: #fff; border: 1px solid #B2DBC2; padding: 2px 8px; border-radius: 4px; font-size: 15px; letter-spacing: 1px;">${password}</code>
            </p>
          </div>
          <p style="color: #c05c00; font-size: 13px;">⚠️ You will be required to change your password on first login. Do not share this email.</p>
          <a href="${appUrl}" style="display: inline-block; margin-top: 8px; background: #0D5C2E; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold;">Sign In Now</a>
          <p style="margin-bottom: 0; margin-top: 24px; font-size: 12px; color: #5E7A68;">
            If you did not expect this email, please ignore it or contact your administrator.
          </p>
        </div>
      </div>
    `,
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    // Non-fatal — user is still created even if email fails
  }
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

    // Validate caller is authenticated and is a developer
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

    // Combined rate limit: 300/hour per developer + 400/hour per IP
    const ip = getClientIp(req)
    const { allowed, reason } = await checkCombinedRateLimit(
      supabaseAdmin, caller.id, ip, 'create-user', 300, 400, 60
    )
    if (!allowed) {
      const message = reason === 'ip'
        ? 'Too many requests from this network.'
        : 'Rate limit exceeded. Max 300 user creations per hour.'
      return new Response(JSON.stringify({ error: message }), {
        status: 429,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, password, full_name, department_id, student_id, role } = body

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    if (department_id !== undefined && department_id !== null && !isValidUUID(department_id)) {
      return new Response(JSON.stringify({ error: 'Invalid department_id format' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Sanitize free-text fields
    const safeFullName = safeText(full_name, 100)
    const safeStudentId = student_id ? safeText(student_id, 50) : null
    if (!safeFullName) {
      return new Response(JSON.stringify({ error: 'Invalid full_name' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Server-side password complexity validation
    const passwordErrors: string[] = []
    if (password.length < 8) passwordErrors.push('at least 8 characters')
    if (!/[A-Z]/.test(password)) passwordErrors.push('an uppercase letter')
    if (!/[a-z]/.test(password)) passwordErrors.push('a lowercase letter')
    if (!/[0-9]/.test(password)) passwordErrors.push('a number')
    if (passwordErrors.length > 0) {
      return new Response(JSON.stringify({ error: `Password must contain: ${passwordErrors.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const validRoles = ['student', 'course_rep', 'assistant_course_rep', 'governor', 'financial_secretary', 'developer']
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Create auth user (email auto-confirmed, no verification email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Insert profile using sanitized values
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: safeFullName,
      department_id: department_id || null,
      student_id: safeStudentId,
      role,
      password_changed: false,
    })
    if (profileError) {
      // Rollback auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Send welcome email with temporary password via Resend (non-fatal if it fails)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      await sendWelcomeEmail(resendKey, email, safeFullName, password, role, APP_URL)
    }

    return new Response(JSON.stringify({ user_id: authData.user.id }), {
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
