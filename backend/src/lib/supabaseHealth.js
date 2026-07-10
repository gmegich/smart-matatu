const { supabaseAnon, supabaseAdmin, isPlaceholderKey } = require('../config/supabase')

async function checkSupabaseConnection() {
  const url = process.env.SUPABASE_URL

  if (isPlaceholderKey(process.env.SUPABASE_SERVICE_ROLE_KEY) || !supabaseAdmin) {
    return {
      ok: false,
      url,
      configured: false,
      error:
        'SUPABASE_SERVICE_ROLE_KEY is not set. Add your secret key from Dashboard → Project Settings → API.',
    }
  }

  try {
    const { error: adminError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (adminError?.message?.includes('Invalid API key')) {
      return {
        ok: false,
        url,
        error: 'Invalid secret key — copy the sb_secret_ key from Dashboard → Project Settings → API.',
      }
    }

    const { error } = await supabaseAnon.from('profiles').select('id', { head: true, count: 'exact' })
    if (error?.message?.includes('fetch failed') || error?.message?.includes('ENOTFOUND')) {
      return { ok: false, url, error: 'Cannot reach Supabase — check Project URL and internet' }
    }
    return { ok: true, url }
  } catch (err) {
    return { ok: false, url, error: err.message }
  }
}

module.exports = { checkSupabaseConnection }
