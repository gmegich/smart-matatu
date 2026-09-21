const { supabaseAdmin } = require('../config/supabase')
const crypto = require('crypto')

const AUTH_TTL_MS = 60_000
const PROFILE_TTL_MS = 60_000

/** @type {Map<string, { user: object, expires: number }>} */
const authCache = new Map()
/** @type {Map<string, { profile: object, expires: number }>} */
const profileCache = new Map()

function tokenKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 32)
}

function getCached(map, key) {
  const hit = map.get(key)
  if (!hit) return null
  if (Date.now() > hit.expires) {
    map.delete(key)
    return null
  }
  return hit
}

function setCached(map, key, value, ttl) {
  map.set(key, { ...value, expires: Date.now() + ttl })
  // Soft cap to avoid unbounded growth
  if (map.size > 500) {
    const first = map.keys().next().value
    map.delete(first)
  }
}

function invalidateProfileCache(userId) {
  for (const [key, entry] of profileCache) {
    if (entry.profile?.id === userId) profileCache.delete(key)
  }
}

function clearAuthCaches() {
  authCache.clear()
  profileCache.clear()
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = header.slice(7)
  const key = tokenKey(token)
  const cached = getCached(authCache, key)

  if (cached?.user) {
    req.user = cached.user
    req.token = token
    return next()
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    authCache.delete(key)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  setCached(authCache, key, { user: data.user }, AUTH_TTL_MS)
  req.user = data.user
  req.token = token
  next()
}

async function loadProfile(req, res, next) {
  const userId = req.user.id
  const cached = getCached(profileCache, userId)

  if (cached?.profile) {
    req.profile = cached.profile
    return next()
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, phone, role, sacco_id, saccos(name)')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return res.status(403).json({ error: 'Profile not found' })
  }

  setCached(profileCache, userId, { profile: data }, PROFILE_TTL_MS)
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

module.exports = {
  authenticate,
  loadProfile,
  requireRole,
  invalidateProfileCache,
  clearAuthCaches,
}
