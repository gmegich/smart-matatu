require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

function cleanEnv(value) {
  return typeof value === 'string' ? value.trim().replace(/\r$/, '') : value
}

const url = cleanEnv(process.env.SUPABASE_URL)
const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const anonKey = cleanEnv(process.env.SUPABASE_ANON_KEY)

const PROJECT_REF = 'wbvzyxkacxthxmcdmtoe'
const SECRET_KEY_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api`

function isPlaceholderKey(key) {
  return !key || key.includes('your-key') || key.includes('YOUR') || key.length < 20
}

if (!url) {
  console.error('Missing SUPABASE_URL in backend/.env')
  process.exit(1)
}

if (isPlaceholderKey(serviceKey)) {
  console.warn('\n⚠️  SUPABASE_SERVICE_ROLE_KEY is not configured in backend/.env')
  console.warn('   Login/register will fail until you add the secret key from:')
  console.warn(`   ${SECRET_KEY_URL}\n`)
}

const supabaseAdmin = isPlaceholderKey(serviceKey)
  ? null
  : createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

const supabaseAnon = createClient(url, anonKey || serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

module.exports = { supabaseAdmin, supabaseAnon, SECRET_KEY_URL, isPlaceholderKey }
