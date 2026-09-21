const { supabaseAdmin } = require('../config/supabase')

const REQUIRED_TABLES = ['profiles', 'wallets', 'saccos', 'routes', 'trips', 'payments']

async function checkDatabase() {
  const results = await Promise.all(
    REQUIRED_TABLES.map(async (name) => {
      const { error } = await supabaseAdmin.from(name).select('id', { head: true, count: 'exact' })
      return [name, error ? { ok: false, error: error.message } : { ok: true }]
    })
  )

  const tables = Object.fromEntries(results)
  const ready = Object.values(tables).every((t) => t.ok)
  return { ready, tables }
}

module.exports = { checkDatabase }
