const express = require('express')

const { createClient } = require('@supabase/supabase-js')

const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')
const { adminPassengerArrive } = require('../lib/tripRating')
const { ensureWallet } = require('../lib/ensureWallet')
const { assertNoOpenTrip, adminSubmitTripFeedback } = require('../lib/tripFeedback')
const { notifyStaffTripRating } = require('../lib/notifyStaff')



const router = express.Router()



function userClient(token) {

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {

    global: { headers: { Authorization: `Bearer ${token}` } },

    auth: { autoRefreshToken: false, persistSession: false },

  })

}



async function assertMatatuNotFull(trip_id, vehicle_id) {

  if (trip_id) {

    const { data } = await supabaseAdmin

      .from('trips')

      .select('is_full')

      .eq('id', trip_id)

      .maybeSingle()

    if (data?.is_full) {

      const err = new Error('Matatu is full — gari limejaa. Chagua matatu nyingine.')

      err.status = 400

      throw err

    }

  }

  if (vehicle_id) {

    const { data } = await supabaseAdmin

      .from('trips')

      .select('is_full')

      .eq('vehicle_id', vehicle_id)

      .eq('status', 'active')

      .maybeSingle()

    if (data?.is_full) {

      const err = new Error('Matatu is full — gari limejaa. Chagua matatu nyingine.')

      err.status = 400

      throw err

    }

  }

}



async function autoSelectTripForRoute(route_id, from_stage_id, to_stage_id) {
  if (!route_id) return { trip_id: null, vehicle_id: null }

  // Determine the passenger's travel direction from stage order
  let direction = null
  if (from_stage_id && to_stage_id) {
    const { data: stages } = await supabaseAdmin
      .from('route_stages')
      .select('id, order_index')
      .in('id', [from_stage_id, to_stage_id])
    const from = stages?.find((s) => s.id === from_stage_id)
    const to = stages?.find((s) => s.id === to_stage_id)
    if (from && to) direction = to.order_index > from.order_index ? 'forward' : 'return'
  }

  const { data: trips } = await supabaseAdmin
    .from('trips')
    .select('id, vehicle_id, is_full, direction, started_at')
    .eq('route_id', route_id)
    .eq('status', 'active')
    .order('started_at', { ascending: true })

  const available = (trips || []).filter((t) => !t.is_full)
  // Prefer a matatu heading the passenger's direction; fall back to any available
  const match = direction
    ? available.find((t) => (t.direction || 'forward') === direction)
    : null
  const chosen = match || available[0]
  if (!chosen) return { trip_id: null, vehicle_id: null }

  return { trip_id: chosen.id, vehicle_id: chosen.vehicle_id || null }
}

async function listPassengerPayments(profile, userId, passengerOnly = false) {
  const baseSelect =
    '*, routes(name), from_stage:from_stage_id(name), to_stage:to_stage_id(name), vehicles(plate_number)'

  const buildQuery = (select) => {
    let q = supabaseAdmin.from('payments').select(select)
    if (passengerOnly || profile.role === 'passenger') {
      q = q.eq('passenger_id', userId)
    } else if (profile.role === 'admin') {
      q = q.eq('sacco_id', profile.sacco_id)
    }
    return q.order('created_at', { ascending: false }).limit(100)
  }

  let { data, error } = await buildQuery(`${baseSelect}, trip_ratings(rating, comment, created_at)`)
  if (error?.message?.includes('trip_ratings')) {
    ;({ data, error } = await buildQuery(baseSelect))
  }

  return { data, error }
}

router.get('/my-trips', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  try {
    const { data, error } = await listPassengerPayments(req.profile, req.user.id, true)
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (err) {
    console.error('GET /payments/my-trips:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.get('/open-trip', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, payment_code, status, routes(name), from_stage:from_stage_id(name), to_stage:to_stage_id(name)')
      .eq('passenger_id', req.user.id)
      .in('status', ['pending', 'verified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ openTrip: data || null })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.get('/', authenticate, loadProfile, async (req, res) => {
  try {
    const { data, error } = await listPassengerPayments(req.profile, req.user.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (err) {
    console.error('GET /payments:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})



router.get('/:id/contact', authenticate, loadProfile, async (req, res) => {

  const { data: payment, error } = await supabaseAdmin

    .from('payments')

    .select('id, passenger_id, trip_id, vehicle_id, payment_code, vehicles(plate_number)')

    .eq('id', req.params.id)

    .maybeSingle()



  if (error) return res.status(400).json({ error: error.message })

  if (!payment) return res.status(404).json({ error: 'Payment not found' })



  const isPassenger = req.profile.role === 'passenger' && payment.passenger_id === req.user.id

  let isDriver = false

  if (req.profile.role === 'driver' && payment.trip_id) {

    const { data: trip } = await supabaseAdmin

      .from('trips')

      .select('driver_id')

      .eq('id', payment.trip_id)

      .maybeSingle()

    isDriver = trip?.driver_id === req.user.id

  }

  if (req.profile.role === 'admin') {

    // admins can view contacts in their sacco via other screens

  } else if (!isPassenger && !isDriver) {

    return res.status(403).json({ error: 'Not allowed' })

  }



  const { data: passenger } = await supabaseAdmin

    .from('profiles')

    .select('full_name, phone, email')

    .eq('id', payment.passenger_id)

    .maybeSingle()



  let driver = null

  if (payment.trip_id) {

    const { data: trip } = await supabaseAdmin

      .from('trips')

      .select('driver_id')

      .eq('id', payment.trip_id)

      .maybeSingle()

    if (trip?.driver_id) {

      const { data: d } = await supabaseAdmin

        .from('profiles')

        .select('full_name, phone, email')

        .eq('id', trip.driver_id)

        .maybeSingle()

      driver = d

    }

  }



  res.json({

    payment_id: payment.id,

    payment_code: payment.payment_code,

    plate: payment.vehicles?.plate_number,

    passenger: passenger ? { full_name: passenger.full_name, phone: passenger.phone, email: passenger.email } : null,

    driver: driver ? { full_name: driver.full_name, phone: driver.phone, email: driver.email } : null,

  })

})



router.post('/', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {

  const { route_id, from_stage_id, to_stage_id } = req.body

  let trip_id = null
  let vehicle_id = null

  try {

    await assertNoOpenTrip(req.user.id)
    await ensureWallet(req.user.id)

    const auto = await autoSelectTripForRoute(route_id, from_stage_id, to_stage_id)
    trip_id = auto.trip_id
    vehicle_id = auto.vehicle_id

  } catch (err) {

    const body = { error: err.message }
    if (err.openTrip) body.openTrip = err.openTrip
    return res.status(err.status || 400).json(body)

  }



  const { data, error } = await userClient(req.token).rpc('create_payment', {

    p_route_id: route_id,

    p_trip_id: trip_id,

    p_vehicle_id: vehicle_id,

    p_from_stage_id: from_stage_id,

    p_to_stage_id: to_stage_id,

  })



  if (error) return res.status(400).json({ error: error.message })

  if (!data?.success) return res.status(400).json({ error: data?.error || 'Payment failed' })



  let driver = null

  if (trip_id) {

    const { data: trip } = await supabaseAdmin

      .from('trips')

      .select('driver_id')

      .eq('id', trip_id)

      .maybeSingle()

    if (trip?.driver_id) {

      const { data: d } = await supabaseAdmin

        .from('profiles')

        .select('full_name, phone')

        .eq('id', trip.driver_id)

        .maybeSingle()

      driver = d

    }

  }

  let assignedVehicle = null
  if (vehicle_id) {
    const { data: v } = await supabaseAdmin
      .from('vehicles')
      .select('plate_number')
      .eq('id', vehicle_id)
      .maybeSingle()
    assignedVehicle = v?.plate_number || null
  }

  res.json({ ...data, driver, assigned_vehicle: assignedVehicle })

})



router.post('/verify', authenticate, loadProfile, requireRole('driver'), async (req, res) => {

  const { payment_code } = req.body

  if (!payment_code) return res.status(400).json({ error: 'payment_code is required' })



  const { data, error } = await userClient(req.token).rpc('verify_payment', {

    p_payment_code: payment_code,

  })



  if (error) return res.status(400).json({ error: error.message })

  if (!data?.success) return res.status(400).json({ error: data?.error || 'Verification failed' })



  const { data: payment } = await supabaseAdmin

    .from('payments')

    .select('passenger_id, payment_code')

    .eq('id', data.payment_id)

    .maybeSingle()



  let passenger = null

  if (payment?.passenger_id) {

    const { data: p } = await supabaseAdmin

      .from('profiles')

      .select('full_name, phone')

      .eq('id', payment.passenger_id)

      .maybeSingle()

    passenger = p

  }



  res.json({ ...data, passenger, payment_code: payment?.payment_code })
})

router.post('/:id/arrive', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  try {
    const { data, error } = await userClient(req.token).rpc('passenger_arrive', {
      p_payment_id: req.params.id,
    })

    if (!error && data?.success) return res.json(data)

    const result = await adminPassengerArrive(req.params.id, req.user.id)
    if (result.success) return res.json(result)

    return res.status(400).json({
      error: result.error || error?.message || data?.error || 'Could not complete trip',
    })
  } catch (err) {
    console.error('POST /payments/:id/arrive:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.post('/:id/feedback', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  const { rating, feedback, comment } = req.body
  const score = Number(rating)
  const text = feedback ?? comment ?? ''

  if (Number.isNaN(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' })
  }

  try {
    const { data, error } = await userClient(req.token).rpc('submit_trip_feedback', {
      p_payment_id: req.params.id,
      p_rating: score,
      p_comment: text || null,
    })

    if (!error && data?.success) {
      notifyStaffTripRating(req.params.id, score, text)
      return res.json(data)
    }

    const result = await adminSubmitTripFeedback(req.params.id, req.user.id, score, text)
    if (result.success) return res.json(result)

    return res.status(400).json({
      error: result.error || error?.message || data?.error || 'Could not save feedback',
    })
  } catch (err) {
    console.error('POST /payments/:id/feedback:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.get('/:id/journey', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  const baseSelect = `id, status, payment_code, amount, trip_id,
       routes(name), vehicles(plate_number),
       from_stage:from_stage_id(name), to_stage:to_stage_id(name)`

  let { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select(`${baseSelect}, arrived_at, trip_ratings(rating, comment, created_at)`)
    .eq('id', req.params.id)
    .eq('passenger_id', req.user.id)
    .maybeSingle()

  if (error?.message?.includes('arrived_at') || error?.message?.includes('trip_ratings')) {
    ;({ data: payment, error } = await supabaseAdmin
      .from('payments')
      .select(baseSelect)
      .eq('id', req.params.id)
      .eq('passenger_id', req.user.id)
      .maybeSingle())
  } else if (error) {
    return res.status(400).json({ error: error.message })
  }

  if (!payment) return res.status(404).json({ error: 'Payment not found' })

  const fb = Array.isArray(payment.trip_ratings)
    ? payment.trip_ratings[0]
    : payment.trip_ratings

  res.json({ ...payment, feedback: fb || null, trip_ratings: undefined })
})

module.exports = router


