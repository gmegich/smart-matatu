require('dotenv').config()
const express = require('express')
const cors = require('cors')
const compression = require('compression')

const authRoutes = require('./routes/auth.routes')
const profileRoutes = require('./routes/profile.routes')
const walletRoutes = require('./routes/wallets.routes')
const paymentRoutes = require('./routes/payments.routes')
const tripRoutes = require('./routes/trips.routes')
const routeRoutes = require('./routes/routes.routes')
const adminRoutes = require('./routes/admin.routes')
const ownerRoutes = require('./routes/owner.routes')
const driverRoutes = require('./routes/driver.routes')
const notificationRoutes = require('./routes/notifications.routes')

const { checkDatabase } = require('./lib/checkDb')
const { checkSupabaseConnection } = require('./lib/supabaseHealth')
const { isPlaceholderKey } = require('./config/supabase')

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (allowedOrigins.includes(origin)) return true
  // Allow any localhost / 127.0.0.1 port during local development
  if (process.env.NODE_ENV !== 'production') {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  }
  return false
}

app.use(compression())
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true)
    return callback(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Smart Matatu API' })
})

app.get('/api/health/db', async (_req, res) => {
  try {
    const result = await checkDatabase()
    res.status(result.ready ? 200 : 503).json(result)
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message })
  }
})

app.get('/api/health/supabase', async (_req, res) => {
  const result = await checkSupabaseConnection()
  res.status(result.ok ? 200 : 503).json(result)
})

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/wallets', walletRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/owner', ownerRoutes)
app.use('/api/driver', driverRoutes)
app.use('/api/notifications', notificationRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, async () => {
  console.log(`Smart Matatu API running on http://localhost:${PORT}`)
  if (isPlaceholderKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.warn('⚠️  Add SUPABASE_SERVICE_ROLE_KEY to backend/.env for login/register')
  } else {
    const supabase = await checkSupabaseConnection()
    console.log(supabase.ok ? '✓ Supabase connected' : `⚠️  Supabase: ${supabase.error}`)
  }
})