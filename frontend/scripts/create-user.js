/**
 * Create a Supabase user WITHOUT sending a confirmation email.
 * Use when the dashboard signup hits "email rate limit exceeded".
 *
 * Usage:
 *   npm run create-user -- email@example.com password123 "John Doe" passenger
 *   npm run create-user -- admin@nakuru.com pass123 "Admin User" admin a0000000-0000-0000-0000-000000000001
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env (never commit this key).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const vars = {}
  try {
    const content = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    content.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const eq = trimmed.indexOf('=')
      if (eq === -1) return
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    })
  } catch {
    console.error('Could not read frontend/.env')
  }
  return vars
}

const [email, password, fullName, role = 'passenger', saccoId] = process.argv.slice(2)

if (!email || !password || !fullName) {
  console.log(`
Usage:
  npm run create-user -- <email> <password> "<full name>" [role] [sacco_id]

Examples:
  npm run create-user -- passenger@test.com pass123 "Test Passenger" passenger
  npm run create-user -- admin@nakuru.com pass123 "SACCO Admin" admin a0000000-0000-0000-0000-000000000001
  npm run create-user -- driver@nakuru.com pass123 "Test Driver" driver a0000000-0000-0000-0000-000000000001

Add to frontend/.env:
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_your-key-here
`)
  process.exit(1)
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in frontend/.env')
  console.error('Get the secret key from: Supabase Dashboard → Project Settings → API')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, role },
})

if (error) {
  console.error('Failed:', error.message)
  process.exit(1)
}

const userId = data.user.id
console.log('User created:', email, `(${userId})`)

if (role !== 'passenger' || saccoId) {
  const updates = { full_name: fullName, role }
  if (saccoId) updates.sacco_id = saccoId
  const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (profileError) console.warn('Profile update:', profileError.message)
  else console.log('Profile updated:', role, saccoId || '')
}

if (role === 'passenger') {
  const { error: walletError } = await supabase.from('wallets').upsert({ user_id: userId, balance: 500 })
  if (walletError) console.warn('Wallet:', walletError.message)
  else console.log('Wallet created with KES 500 starter balance')
}

console.log('\nDone! Login at http://localhost:5173/login')
console.log(`  Email: ${email}`)
console.log(`  Password: ${password}`)
