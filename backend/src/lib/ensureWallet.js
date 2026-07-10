const { supabaseAdmin } = require('../config/supabase')

async function ensureWallet(userId) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (existing) return existing

  const { data: created, error: insertError } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId, balance: 0 })
    .select('*')
    .single()

  if (insertError) {
    if (insertError.message?.includes('duplicate')) {
      const { data: retry } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single()
      return retry
    }
    throw new Error(insertError.message)
  }

  return created
}

module.exports = { ensureWallet }
