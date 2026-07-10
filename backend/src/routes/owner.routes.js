const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, loadProfile, requireRole('owner'))

router.get('/vehicles', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*, saccos(name)')
    .eq('owner_id', req.user.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

async function getOwnerPercentage(saccoId) {
  if (!saccoId) return 70
  const { data } = await supabaseAdmin
    .from('sacco_settings')
    .select('owner_earnings_percentage')
    .eq('sacco_id', saccoId)
    .maybeSingle()
  return data?.owner_earnings_percentage != null ? Number(data.owner_earnings_percentage) : 70
}

// Earnings are derived directly from verified/completed fares on the owner's
// vehicles (the source of truth), so they show even if the owner_earnings
// ledger was never populated.
async function buildOwnerEarnings(ownerId, saccoId) {
  const { data: vehicles } = await supabaseAdmin
    .from('vehicles')
    .select('id, plate_number')
    .eq('owner_id', ownerId)

  const vehicleMap = {}
  ;(vehicles || []).forEach((v) => {
    vehicleMap[v.id] = v.plate_number
  })
  const vehicleIds = Object.keys(vehicleMap)
  if (!vehicleIds.length) return { total: 0, earnings: [], vehicleIds: [], vehicleMap }

  const pct = await getOwnerPercentage(saccoId)

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id, amount, vehicle_id, payment_code, verified_at, created_at')
    .in('vehicle_id', vehicleIds)
    .in('status', ['verified', 'completed'])
    .order('verified_at', { ascending: false })

  const earnings = (payments || []).map((p) => {
    const totalAmount = Number(p.amount || 0)
    const ownerShare = Math.round((totalAmount * pct) / 100 * 100) / 100
    return {
      id: p.id,
      created_at: p.verified_at || p.created_at,
      vehicles: { plate_number: vehicleMap[p.vehicle_id] },
      payments: { payment_code: p.payment_code },
      total_amount: totalAmount,
      owner_share: ownerShare,
      sacco_share: totalAmount - ownerShare,
    }
  })

  const total = earnings.reduce((s, e) => s + e.owner_share, 0)
  return { total, earnings, vehicleIds, vehicleMap }
}

router.get('/earnings', async (req, res) => {
  try {
    const { total, earnings } = await buildOwnerEarnings(req.user.id, req.profile.sacco_id)
    res.json({ total, earnings })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/dashboard', async (req, res) => {
  const ownerId = req.user.id

  const { data: vehicles, error: vehiclesError } = await supabaseAdmin
    .from('vehicles')
    .select('id, plate_number, capacity, status, saccos(name)')
    .eq('owner_id', ownerId)

  if (vehiclesError) return res.status(400).json({ error: vehiclesError.message })

  const vehicleIds = (vehicles || []).map((v) => v.id)
  if (!vehicleIds.length) {
    return res.json({
      totalEarnings: 0,
      totalTrips: 0,
      activeTrips: 0,
      vehicles: [],
    })
  }

  const pct = await getOwnerPercentage(req.profile.sacco_id)

  const [
    { data: paidPayments },
    { data: trips },
    { data: locations },
    { data: activeTrips },
  ] = await Promise.all([
    supabaseAdmin
      .from('payments')
      .select('amount, vehicle_id')
      .in('vehicle_id', vehicleIds)
      .in('status', ['verified', 'completed']),
    supabaseAdmin.from('trips').select('id, vehicle_id, status').in('vehicle_id', vehicleIds),
    supabaseAdmin
      .from('vehicle_locations')
      .select('vehicle_id, latitude, longitude, updated_at')
      .in('vehicle_id', vehicleIds),
    supabaseAdmin
      .from('trips')
      .select('id, vehicle_id, status, routes(name), profiles:driver_id(full_name)')
      .in('vehicle_id', vehicleIds)
      .eq('status', 'active'),
  ])

  const earningsByVehicle = {}
  ;(paidPayments || []).forEach((p) => {
    const ownerShare = Math.round((Number(p.amount || 0) * pct) / 100 * 100) / 100
    earningsByVehicle[p.vehicle_id] = (earningsByVehicle[p.vehicle_id] || 0) + ownerShare
  })

  const tripsByVehicle = {}
  ;(trips || []).forEach((t) => {
    tripsByVehicle[t.vehicle_id] = (tripsByVehicle[t.vehicle_id] || 0) + 1
  })

  const locationByVehicle = {}
  ;(locations || []).forEach((l) => {
    locationByVehicle[l.vehicle_id] = l
  })

  const activeByVehicle = {}
  ;(activeTrips || []).forEach((t) => {
    activeByVehicle[t.vehicle_id] = t
  })

  const vehicleStats = (vehicles || []).map((v) => ({
    ...v,
    earnings: earningsByVehicle[v.id] || 0,
    tripCount: tripsByVehicle[v.id] || 0,
    location: locationByVehicle[v.id] || null,
    activeTrip: activeByVehicle[v.id] || null,
  }))

  const totalEarnings = vehicleStats.reduce((s, v) => s + v.earnings, 0)
  const totalTrips = vehicleStats.reduce((s, v) => s + v.tripCount, 0)

  res.json({
    totalEarnings,
    totalTrips,
    activeTrips: (activeTrips || []).length,
    vehicles: vehicleStats,
  })
})

module.exports = router
