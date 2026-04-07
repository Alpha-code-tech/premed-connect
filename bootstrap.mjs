/**
 * PreMed Connect — Bootstrap Script
 * Creates the first developer account using the service role key.
 *
 * Usage:
 *   node bootstrap.mjs <email> <password> <full_name>
 *
 * Example:
 *   node bootstrap.mjs admin@premed.com "MyPass123!" "John Doe"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (no VITE_ prefix — never expose this to the frontend)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Parse .env.local
const env = {}
try {
  const raw = readFileSync(join(__dir, '.env.local'), 'utf8')
  raw.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx < 0) return
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  })
} catch {
  console.error('Could not read .env.local')
  process.exit(1)
}

const SUPABASE_URL = env['VITE_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const [,, email, password, ...nameParts] = process.argv
const fullName = nameParts.join(' ')

if (!email || !password || !fullName) {
  console.error('Usage: node bootstrap.mjs <email> <password> <full name>')
  console.error('Example: node bootstrap.mjs dev@premed.com "Pass123!@" "John Doe"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`Creating developer account for ${email}...`)

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('Auth error:', authError.message)
    process.exit(1)
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    role: 'developer',
    department_id: null,
    student_id: null,
    password_changed: false,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.error('Profile error:', profileError.message)
    process.exit(1)
  }

  console.log('✓ Developer account created!')
  console.log(`  Email:   ${email}`)
  console.log(`  User ID: ${authData.user.id}`)
  console.log('\nLog in at http://localhost:5173/login')
  console.log('You will be prompted to change your password on first login.')
}

main().catch(err => { console.error(err); process.exit(1) })
