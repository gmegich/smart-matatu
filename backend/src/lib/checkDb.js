const { supabaseAdmin } = require('../config/supabase')

const REQUIRED_TABLES = ['profiles', 'wallets', 'saccos', 'routes', 'trips', 'payments']

async function checkDatabase() {
  const tables = {}

  for (const name of REQUIRED_TABLES) {
    const { error } = await supabaseAdmin.from(name).select('*', { head: true, count: 'exact' })
    tables[name] = error
      ? { ok: false, error: error.message }
      : { ok: true }
  }

  const ready = Object.values(tables).every((t) => t.ok)
  return { ready, tables }
}

module.exports = { checkDatabase }
