const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, loadProfile, requireRole('driver'))

router.get('/assignment', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('driver_assignments')
    .select('*, vehicles(plate_number, id, capacity), routes(name, id)')
    .eq('driver_id', req.user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/active-trip', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('trips')
    .select('*, routes(name), vehicles(plate_number, capacity)')
    .eq('driver_id', req.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/collections', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayPayments, error: todayError }, { data: trip }] = await Promise.all([
    supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('verified_by', req.user.id)
      .eq('status', 'verified')
      .gte('verified_at', `${today}T00:00:00`),
    supabaseAdmin
      .from('trips')
      .select('id, is_full, vehicles(plate_number, capacity)')
      .eq('driver_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (todayError) return res.status(400).json({ error: todayError.message })

  let tripPayments = []
  if (trip?.id) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('amount, status')
      .eq('trip_id', trip.id)

    if (error) return res.status(400).json({ error: error.message })
    tripPayments = data || []
  }

  const verifiedTrip = tripPayments.filter((p) => p.status === 'verified')
  const pendingTrip = tripPayments.filter((p) => p.status === 'pending')

  const sum = (rows) => rows.reduce((s, p) => s + Number(p.amount || 0), 0)

  res.json({
    today_total: sum(todayPayments || []),
    today_count: (todayPayments || []).length,
    trip_verified_total: sum(verifiedTrip),
    trip_verified_count: verifiedTrip.length,
    trip_pending_count: pendingTrip.length,
    active_trip: trip,
  })
})

router.get('/trip/passengers', async (req, res) => {
  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('id')
    .eq('driver_id', req.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!trip?.id) return res.json({ passengers: [] })

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(
      'id, payment_code, amount, status, created_at, passenger:profiles!payments_passenger_id_fkey(full_name, phone)'
    )
    .eq('trip_id', trip.id)
    .in('status', ['pending', 'verified'])
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json({ passengers: data || [] })
})

router.patch('/trip/full', async (req, res) => {
  const { is_full } = req.body

  const { data, error } = await supabaseAdmin
    .from('trips')
    .update({ is_full: !!is_full })
    .eq('driver_id', req.user.id)
    .eq('status', 'active')
    .select('*, routes(name), vehicles(plate_number)')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  if (!data) return res.status(404).json({ error: 'No active trip found' })

  res.json(data)
})

module.exports = router
