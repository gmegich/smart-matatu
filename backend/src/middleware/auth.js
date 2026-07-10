const { supabaseAdmin } = require('../config/supabase')

async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = header.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = data.user
  req.token = token
  next()
}

async function loadProfile(req, res, next) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*, saccos(name)')
    .eq('id', req.user.id)
    .single()

  if (error || !data) {
    return res.status(403).json({ error: 'Profile not found' })
  }

  req.profile = data
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

module.exports = { authenticate, loadProfile, requireRole }
