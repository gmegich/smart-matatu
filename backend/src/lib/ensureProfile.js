const { supabaseAdmin } = require('../config/supabase')
const { ensureWallet } = require('./ensureWallet')

async function ensureUserProfile(user, overrides = {}) {
  const id = user.id
  const email = user.email
  const full_name =
    overrides.full_name ||
    user.user_metadata?.full_name ||
    email?.split('@')[0] ||
    'User'
  const role = overrides.role || user.user_metadata?.role || 'passenger'

  const { data: existing, error: checkError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (checkError) {
    if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
      throw new Error(
        'Database tables missing. Run supabase/schema.sql in your Supabase SQL Editor first.'
      )
    }
    throw new Error(checkError.message)
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id,
      email,
      full_name,
      role,
      sacco_id: overrides.sacco_id || null,
      phone: overrides.phone || null,
    })

    if (insertError && !insertError.message.includes('duplicate')) {
      throw new Error(`Could not create profile: ${insertError.message}`)
    }
  } else if (overrides.role || overrides.sacco_id || overrides.full_name || overrides.phone) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...(overrides.full_name && { full_name: overrides.full_name }),
        ...(overrides.role && { role: overrides.role }),
        ...(overrides.sacco_id !== undefined && { sacco_id: overrides.sacco_id }),
        ...(overrides.phone && { phone: overrides.phone }),
      })
      .eq('id', id)

    if (updateError) throw new Error(`Could not update profile: ${updateError.message}`)
  }

  if (role === 'passenger') {
    try {
      await ensureWallet(id)
    } catch (walletError) {
      console.warn('Wallet ensure:', walletError.message)
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*, saccos(name)')
    .eq('id', id)
    .single()

  if (profileError) throw new Error(profileError.message)
  return profile
}

module.exports = { ensureUserProfile }
