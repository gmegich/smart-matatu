const express = require('express')
const { supabaseAdmin, supabaseAnon } = require('../config/supabase')
const { ensureUserProfile } = require('../lib/ensureProfile')
const { authenticate } = require('../middleware/auth')
const { friendlySupabaseError } = require('../lib/errors')

const router = express.Router()

const PUBLIC_REGISTER_ROLES = ['passenger', 'driver']
const DEFAULT_SACCO_ID = 'a0000000-0000-0000-0000-000000000001'

function getAppUrl() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173'
  return raw.split(',')[0].trim()
}

function requireAdminClient(res) {
  if (!supabaseAdmin) {
    res.status(503).json({
      error:
        'Backend not configured: add SUPABASE_SERVICE_ROLE_KEY to backend/.env (Dashboard → Project Settings → API → secret key).',
    })
    return false
  }
  return true
}

router.post('/register', async (req, res) => {
  try {
    if (!requireAdminClient(res)) return
    const { email, password, full_name, phone, role: requestedRole } = req.body
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' })
    }

    if (requestedRole === 'admin') {
      return res.status(403).json({
        error: 'Admin accounts can only be created by an existing admin. Contact your SACCO administrator.',
      })
    }
    if (requestedRole === 'owner') {
      return res.status(403).json({
        error: 'Owner accounts can only be created by an admin. Contact your SACCO administrator.',
      })
    }

    const role = PUBLIC_REGISTER_ROLES.includes(requestedRole) ? requestedRole : 'passenger'
    if ((role === 'passenger' || role === 'driver') && !phone) {
      return res.status(400).json({ error: 'phone is required for passengers and drivers (SMS alerts)' })
    }
    const sacco_id = role === 'passenger' ? null : DEFAULT_SACCO_ID

    let userId = null
    let userRecord = null

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

    if (error) {
      const alreadyExists =
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('registered')

      if (!alreadyExists) {
        return res.status(400).json({ error: friendlySupabaseError(error.message) })
      }

      const { data: loginTry, error: loginErr } = await supabaseAnon.auth.signInWithPassword({
        email,
        password,
      })
      if (loginTry?.user) {
        userRecord = loginTry.user
        const profile = await ensureUserProfile(userRecord, { full_name, role, sacco_id, phone })
        return res.status(201).json({
          message: 'Account ready',
          user: loginTry.user,
          session: loginTry.session,
          profile,
        })
      }
      return res.status(400).json({
        error: friendlySupabaseError(loginErr?.message || 'Email already registered. Log in with your password.'),
      })
    } else {
      userId = data.user.id
      userRecord = data.user
    }

    const profile = await ensureUserProfile(userRecord, { full_name, role, sacco_id, phone })

    const { data: sessionData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      return res.status(201).json({
        message: 'Account ready. Please log in.',
        user: { id: userId, email },
        profile,
      })
    }

    res.status(201).json({
      message: 'Account created',
      user: sessionData.user,
      session: sessionData.session,
      profile,
    })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(400).json({ error: friendlySupabaseError(err.message) })
  }
})

router.post('/login', async (req, res) => {
  try {
    if (!requireAdminClient(res)) return
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: friendlySupabaseError(error.message) })

    const profile = await ensureUserProfile(data.user)

    res.json({ user: data.user, session: data.session, profile })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(400).json({ error: friendlySupabaseError(err.message) })
  }
})

router.post('/logout', async (_req, res) => {
  res.json({ message: 'Logged out' })
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    const redirectTo = `${getAppUrl()}/reset-password`
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      console.error('Forgot password error:', error.message)
      const rateLimited = error.message?.toLowerCase().includes('rate limit')
      if (rateLimited) {
        return res.status(429).json({
          error: 'Too many reset requests. Please wait a few minutes and try again.',
        })
      }
    }

    res.json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    })
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(400).json({ error: friendlySupabaseError(err.message) })
  }
})

router.post('/reset-password', authenticate, async (req, res) => {
  try {
    if (!requireAdminClient(res)) return
    const { password } = req.body
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password })
    if (error) {
      return res.status(400).json({ error: friendlySupabaseError(error.message) })
    }

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Reset password error:', err.message)
    res.status(400).json({ error: friendlySupabaseError(err.message) })
  }
})

router.post('/repair-profile', authenticate, async (req, res) => {
  try {
    const profile = await ensureUserProfile(req.user)
    res.json({ message: 'Profile ready', profile })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
