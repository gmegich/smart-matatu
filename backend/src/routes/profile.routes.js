const express = require('express')
const { authenticate } = require('../middleware/auth')
const { ensureUserProfile } = require('../lib/ensureProfile')

const router = express.Router()

router.get('/me', authenticate, async (req, res) => {
  try {
    const profile = await ensureUserProfile(req.user)
    res.json({ user: req.user, profile })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/repair', authenticate, async (req, res) => {
  try {
    const profile = await ensureUserProfile(req.user)
    res.json({ message: 'Profile created', profile })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.patch('/phone', authenticate, async (req, res) => {
  const { supabaseAdmin } = require('../config/supabase')
  const { phone } = req.body
  if (!phone?.trim()) return res.status(400).json({ error: 'phone is required' })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ phone: phone.trim() })
    .eq('id', req.user.id)
    .select('*')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ profile: data })
})

module.exports = router
