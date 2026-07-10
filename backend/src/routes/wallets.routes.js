const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')
const { ensureWallet } = require('../lib/ensureWallet')

const router = express.Router()

router.get('/me', authenticate, loadProfile, async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id)
    res.json(wallet)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/transactions', authenticate, loadProfile, async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id)

    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/topup', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  const { amount } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  try {
    await ensureWallet(req.user.id)

    const { data, error } = await supabaseAdmin.rpc('topup_wallet', {
      p_user_id: req.user.id,
      p_amount: amount,
      p_type: 'self_topup',
      p_description: 'Self top-up (simulated)',
    })

    if (error) return res.status(400).json({ error: error.message })
    if (!data?.success) return res.status(400).json({ error: data?.error || 'Top-up failed' })
    res.json(data)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/admin/credit', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { user_id, amount } = req.body
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and amount are required' })
  }

  const { data, error } = await supabaseAdmin.rpc('topup_wallet', {
    p_user_id: user_id,
    p_amount: amount,
    p_type: 'admin_credit',
    p_description: 'Admin wallet credit',
  })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/admin/debit', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { user_id, amount } = req.body
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'user_id and amount are required' })
  }

  const wallet = await ensureWallet(user_id)
  const debit = Number(amount)
  if (debit > Number(wallet.balance)) {
    return res.status(400).json({ error: 'Insufficient wallet balance' })
  }

  const newBalance = Number(wallet.balance) - debit
  const { error: updateError } = await supabaseAdmin
    .from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id)

  if (updateError) return res.status(400).json({ error: updateError.message })

  await supabaseAdmin.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    type: 'admin_debit',
    amount: -debit,
    balance_after: newBalance,
    description: 'Admin wallet debit',
  })

  res.json({ success: true, balance: newBalance })
})

router.patch('/admin/passengers/:id', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { full_name, phone } = req.body
  const { data: target, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', req.params.id)
    .single()

  if (findError || !target) return res.status(404).json({ error: 'Passenger not found' })
  if (target.role !== 'passenger') return res.status(400).json({ error: 'User is not a passenger' })

  const updates = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (phone !== undefined) updates.phone = phone || null

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/admin/passengers', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, phone, created_at, wallets(id, balance, updated_at)')
    .eq('role', 'passenger')
    .order('full_name')

  if (error) return res.status(400).json({ error: error.message })

  const passengers = (data || []).map((p) => {
    const wallet = Array.isArray(p.wallets) ? p.wallets[0] : p.wallets
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      created_at: p.created_at,
      balance: wallet?.balance ?? 0,
      wallet_id: wallet?.id,
    }
  })

  const total_balance = passengers.reduce((s, p) => s + Number(p.balance || 0), 0)

  res.json({ passengers, total_balance, count: passengers.length })
})

module.exports = router
