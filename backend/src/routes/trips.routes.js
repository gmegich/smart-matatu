const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')

const router = express.Router()

function userClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

router.get('/', authenticate, loadProfile, async (req, res) => {
  let query = supabaseAdmin
    .from('trips')
    .select('*, routes(name), vehicles(plate_number), profiles:driver_id(full_name)')
    .order('started_at', { ascending: false })
    .limit(50)

  if (req.profile.role === 'driver') {
    query = query.eq('driver_id', req.user.id)
  } else if (req.profile.role === 'admin') {
    query = query.eq('sacco_id', req.profile.sacco_id)
  } else if (req.profile.role === 'owner') {
    const { data: vehicles } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('owner_id', req.user.id)
    const ids = (vehicles || []).map((v) => v.id)
    if (!ids.length) return res.json([])
    query = query.in('vehicle_id', ids)
  }

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/active', authenticate, loadProfile, async (req, res) => {
  const { route_id } = req.query
  let query = supabaseAdmin
    .from('trips')
    .select('*, vehicles(plate_number, id)')
    .eq('status', 'active')

  if (route_id) query = query.eq('route_id', route_id)

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/start', authenticate, loadProfile, requireRole('driver'), async (req, res) => {
  const { vehicle_id, route_id } = req.body
  const { data, error } = await userClient(req.token).rpc('start_trip', {
    p_vehicle_id: vehicle_id,
    p_route_id: route_id,
  })

  if (error) return res.status(400).json({ error: error.message })
  if (!data?.success) return res.status(400).json({ error: data?.error || 'Failed to start trip' })
  res.json(data)
})

router.post('/end', authenticate, loadProfile, requireRole('driver'), async (req, res) => {
  const { trip_id } = req.body
  const { data, error } = await userClient(req.token).rpc('end_trip', { p_trip_id: trip_id })

  if (error) return res.status(400).json({ error: error.message })
  if (!data?.success) return res.status(400).json({ error: data?.error || 'Failed to end trip' })
  res.json(data)
})

router.post('/location', authenticate, loadProfile, requireRole('driver'), async (req, res) => {
  const { vehicle_id, trip_id, latitude, longitude } = req.body
  const { data, error } = await userClient(req.token).rpc('upsert_vehicle_location', {
    p_vehicle_id: vehicle_id,
    p_trip_id: trip_id,
    p_latitude: latitude,
    p_longitude: longitude,
  })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

router.get('/locations/:vehicleId', authenticate, loadProfile, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('vehicle_locations')
    .select('*')
    .eq('vehicle_id', req.params.vehicleId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router
