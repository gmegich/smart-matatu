const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { ensureUserProfile } = require('../lib/ensureProfile')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate, loadProfile, requireRole('admin'))

router.get('/users', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('sacco_id', req.profile.sacco_id)
    .neq('role', 'passenger')

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.post('/users', async (req, res) => {
  const {
    email,
    password,
    full_name,
    phone,
    role,
    initial_wallet_balance,
    plate_number,
    capacity,
    vehicles: vehiclesInput,
  } = req.body
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name, and role are required' })
  }

  const allowedRoles = ['passenger', 'driver', 'owner', 'admin']
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${allowedRoles.join(', ')}` })
  }

  let ownerVehicles = []
  if (role === 'owner') {
    const rawVehicles = Array.isArray(vehiclesInput) && vehiclesInput.length
      ? vehiclesInput
      : [{ plate_number, capacity }]

    ownerVehicles = rawVehicles
      .map((v) => ({
        plate_number: v.plate_number?.trim().toUpperCase(),
        capacity: v.capacity ? Number(v.capacity) : 14,
      }))
      .filter((v) => v.plate_number)

    if (!ownerVehicles.length) {
      return res.status(400).json({ error: 'At least one plate_number is required when creating an owner' })
    }

    const seen = new Set()
    for (const v of ownerVehicles) {
      if (seen.has(v.plate_number)) {
        return res.status(400).json({ error: `Duplicate plate number: ${v.plate_number}` })
      }
      seen.add(v.plate_number)
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) return res.status(400).json({ error: error.message })

  const sacco_id = role === 'passenger' ? null : req.profile.sacco_id

  try {
    const profile = await ensureUserProfile(data.user, {
      full_name,
      role,
      sacco_id,
      phone,
    })

    let walletBalance = 0
    if (role === 'passenger' && initial_wallet_balance && Number(initial_wallet_balance) > 0) {
      const { data: walletData, error: walletError } = await supabaseAdmin.rpc('topup_wallet', {
        p_user_id: data.user.id,
        p_amount: Number(initial_wallet_balance),
        p_type: 'admin_credit',
        p_description: 'Opening balance from admin',
      })
      if (walletError) {
        throw new Error(`Wallet credit failed: ${walletError.message}`)
      }
      walletBalance = walletData?.balance ?? Number(initial_wallet_balance)
    }

    let vehicles = []
    if (role === 'owner') {
      const { data: vehicleData, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .insert(
          ownerVehicles.map((v) => ({
            plate_number: v.plate_number,
            capacity: v.capacity,
            owner_id: data.user.id,
            status: 'active',
            sacco_id: req.profile.sacco_id,
          }))
        )
        .select()

      if (vehicleError) {
        throw new Error(vehicleError.message)
      }
      vehicles = vehicleData || []
    }

    res.status(201).json({
      id: data.user.id,
      email,
      full_name,
      role,
      profile,
      wallet_balance: role === 'passenger' ? walletBalance : undefined,
      vehicle: vehicles[0] || null,
      vehicles,
    })
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {})
    return res.status(400).json({ error: err.message })
  }
})

router.get('/vehicles', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*, profiles:owner_id(full_name)')
    .eq('sacco_id', req.profile.sacco_id)

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.get('/owner-vehicles/:ownerId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .eq('owner_id', req.params.ownerId)
    .eq('sacco_id', req.profile.sacco_id)
    .order('created_at', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data || [])
})

router.post('/vehicles', async (req, res) => {
  const { plate_number, capacity, owner_id, status } = req.body
  const plate = plate_number?.trim().toUpperCase()
  if (!plate) return res.status(400).json({ error: 'plate_number is required' })

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert({
      plate_number: plate,
      capacity: capacity ? Number(capacity) : 14,
      owner_id: owner_id || null,
      status: status || 'active',
      sacco_id: req.profile.sacco_id,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

router.post('/assignments', async (req, res) => {
  const { driver_id, vehicle_id, route_id } = req.body
  if (!driver_id || !vehicle_id) {
    return res.status(400).json({ error: 'driver_id and vehicle_id are required' })
  }

  await supabaseAdmin
    .from('driver_assignments')
    .update({ is_active: false })
    .eq('driver_id', driver_id)
    .eq('is_active', true)

  const { data, error } = await supabaseAdmin
    .from('driver_assignments')
    .insert({
      driver_id,
      vehicle_id,
      route_id: route_id || null,
      is_active: true,
    })
    .select('*, profiles:driver_id(full_name), vehicles(plate_number), routes(name)')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})

router.get('/analytics', async (req, res) => {
  const saccoId = req.profile.sacco_id

  const [
    { count: vehicles },
    { count: drivers },
    { count: activeTrips },
    { data: payments },
  ] = await Promise.all([
    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId).eq('role', 'driver'),
    supabaseAdmin.from('trips').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId).eq('status', 'active'),
    supabaseAdmin.from('payments').select('amount, route_id, created_at, routes(name)').eq('sacco_id', saccoId).eq('status', 'verified'),
  ])

  const totalRevenue = (payments || []).reduce((s, p) => s + Number(p.amount), 0)

  const byRoute = {}
  ;(payments || []).forEach((p) => {
    const name = p.routes?.name || 'Unknown'
    byRoute[name] = (byRoute[name] || 0) + Number(p.amount)
  })

  const byDay = {}
  ;(payments || []).forEach((p) => {
    const day = new Date(p.created_at).toLocaleDateString('en-KE', { weekday: 'short' })
    byDay[day] = (byDay[day] || 0) + Number(p.amount)
  })

  res.json({
    vehicles,
    drivers,
    activeTrips,
    totalRevenue,
    revenueByRoute: Object.entries(byRoute).map(([name, revenue]) => ({ name, revenue })),
    dailyRevenue: Object.entries(byDay).map(([day, revenue]) => ({ day, revenue })),
    payments: payments || [],
  })
})

router.get('/staff-options', async (req, res) => {
  const [{ data: owners }, { data: drivers }, { data: routes }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name').eq('sacco_id', req.profile.sacco_id).eq('role', 'owner'),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, sacco_id, saccos(name)')
      .eq('role', 'driver')
      .order('full_name'),
    supabaseAdmin.from('routes').select('id, name').eq('sacco_id', req.profile.sacco_id),
  ])
  res.json({ owners, drivers, routes })
})

router.get('/drivers', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, phone, sacco_id, saccos(name)')
    .eq('role', 'driver')
    .order('full_name')

  if (error) return res.status(400).json({ error: error.message })
  res.json(data || [])
})

router.get('/feedback', async (req, res) => {
  const saccoId = req.profile.sacco_id

  const { data, error } = await supabaseAdmin
    .from('trip_ratings')
    .select(`
      id,
      rating,
      comment,
      created_at,
      passenger:passenger_id(full_name, email, phone),
      driver:driver_id(full_name),
      payment:payment_id!inner(
        sacco_id,
        payment_code,
        amount,
        routes(name),
        vehicles(plate_number),
        from_stage:from_stage_id(name),
        to_stage:to_stage_id(name)
      )
    `)
    .eq('payment.sacco_id', saccoId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.message?.includes('trip_ratings') || error.code === '42P01') {
      return res.json({
        feedback: [],
        summary: { count: 0, average: null },
        message: 'Run supabase/add-trip-feedback.sql in Supabase SQL Editor.',
      })
    }
    return res.status(400).json({ error: error.message })
  }

  const feedback = data || []
  const count = feedback.length
  const average =
    count > 0
      ? Math.round((feedback.reduce((sum, r) => sum + Number(r.rating), 0) / count) * 10) / 10
      : null

  res.json({ feedback, summary: { count, average } })
})

async function getProfileOr404(id) {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single()
  if (error || !data) throw new Error('User not found')
  return data
}

async function assertVehicleInSacco(vehicleId, saccoId) {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('id, sacco_id')
    .eq('id', vehicleId)
    .single()
  if (error || !data) throw new Error('Vehicle not found')
  if (data.sacco_id !== saccoId) throw new Error('Vehicle not in your SACCO')
  return data
}

router.patch('/users/:id', async (req, res) => {
  const { id } = req.params
  const { full_name, phone, role, password } = req.body

  try {
    const target = await getProfileOr404(id)
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Use profile settings to edit your own account' })
    }

    if (
      target.role !== 'passenger' &&
      target.role !== 'driver' &&
      target.sacco_id &&
      target.sacco_id !== req.profile.sacco_id
    ) {
      return res.status(403).json({ error: 'Cannot edit user outside your SACCO' })
    }

    const updates = {}
    if (full_name !== undefined) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone || null
    if (role && ['passenger', 'driver', 'owner', 'admin'].includes(role)) {
      updates.role = role
      updates.sacco_id = role === 'passenger' ? null : req.profile.sacco_id
    }

    if (Object.keys(updates).length) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) return res.status(400).json({ error: error.message })
    }

    if (password) {
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
      if (pwError) return res.status(400).json({ error: pwError.message })
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single()
    res.json(profile)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })

  try {
    const target = await getProfileOr404(id)
    if (
      target.role !== 'passenger' &&
      target.role !== 'driver' &&
      target.sacco_id &&
      target.sacco_id !== req.profile.sacco_id
    ) {
      return res.status(403).json({ error: 'Cannot delete user outside your SACCO' })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.patch('/vehicles/:id', async (req, res) => {
  const { plate_number, capacity, owner_id, status } = req.body
  try {
    await assertVehicleInSacco(req.params.id, req.profile.sacco_id)
    const updates = {}
    if (plate_number !== undefined) updates.plate_number = plate_number.trim().toUpperCase()
    if (capacity !== undefined) updates.capacity = Number(capacity)
    if (owner_id !== undefined) updates.owner_id = owner_id || null
    if (status !== undefined) updates.status = status

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, profiles:owner_id(full_name)')
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.delete('/vehicles/:id', async (req, res) => {
  try {
    await assertVehicleInSacco(req.params.id, req.profile.sacco_id)
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update({ status: 'inactive' })
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.patch('/assignments/:id', async (req, res) => {
  const { vehicle_id, route_id } = req.body
  const { data: assignment, error: findError } = await supabaseAdmin
    .from('driver_assignments')
    .select('*, vehicles(sacco_id)')
    .eq('id', req.params.id)
    .single()

  if (findError || !assignment) return res.status(404).json({ error: 'Assignment not found' })
  if (assignment.vehicles?.sacco_id !== req.profile.sacco_id) {
    return res.status(403).json({ error: 'Assignment not in your SACCO' })
  }

  const updates = {}
  if (vehicle_id !== undefined) {
    await assertVehicleInSacco(vehicle_id, req.profile.sacco_id)
    updates.vehicle_id = vehicle_id
  }
  if (route_id !== undefined) updates.route_id = route_id || null

  const { data, error } = await supabaseAdmin
    .from('driver_assignments')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, profiles:driver_id(full_name), vehicles(plate_number), routes(name)')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

router.delete('/assignments/:id', async (req, res) => {
  const { data: assignment, error: findError } = await supabaseAdmin
    .from('driver_assignments')
    .select('*, vehicles(sacco_id)')
    .eq('id', req.params.id)
    .single()

  if (findError || !assignment) return res.status(404).json({ error: 'Assignment not found' })
  if (assignment.vehicles?.sacco_id !== req.profile.sacco_id) {
    return res.status(403).json({ error: 'Assignment not in your SACCO' })
  }

  const { error } = await supabaseAdmin
    .from('driver_assignments')
    .update({ is_active: false })
    .eq('id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

router.get('/settings', async (req, res) => {
  const [{ data: settings }, { data: sacco }] = await Promise.all([
    supabaseAdmin
      .from('sacco_settings')
      .select('*')
      .eq('sacco_id', req.profile.sacco_id)
      .maybeSingle(),
    supabaseAdmin.from('saccos').select('*').eq('id', req.profile.sacco_id).single(),
  ])
  res.json({ settings, sacco })
})

router.patch('/settings', async (req, res) => {
  const { owner_earnings_percentage, sacco_name, sacco_description } = req.body

  if (owner_earnings_percentage !== undefined) {
    const pct = Number(owner_earnings_percentage)
    if (pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'owner_earnings_percentage must be 0–100' })
    }
    const { error } = await supabaseAdmin
      .from('sacco_settings')
      .upsert({
        sacco_id: req.profile.sacco_id,
        owner_earnings_percentage: pct,
      })
    if (error) return res.status(400).json({ error: error.message })
  }

  if (sacco_name !== undefined || sacco_description !== undefined) {
    const saccoUpdates = {}
    if (sacco_name !== undefined) saccoUpdates.name = sacco_name
    if (sacco_description !== undefined) saccoUpdates.description = sacco_description
    const { error } = await supabaseAdmin
      .from('saccos')
      .update(saccoUpdates)
      .eq('id', req.profile.sacco_id)
    if (error) return res.status(400).json({ error: error.message })
  }

  const [{ data: settings }, { data: sacco }] = await Promise.all([
    supabaseAdmin.from('sacco_settings').select('*').eq('sacco_id', req.profile.sacco_id).maybeSingle(),
    supabaseAdmin.from('saccos').select('*').eq('id', req.profile.sacco_id).single(),
  ])
  res.json({ settings, sacco })
})

router.post('/trips/:id/end', async (req, res) => {
  const { data: trip, error: findError } = await supabaseAdmin
    .from('trips')
    .select('id, status, sacco_id')
    .eq('id', req.params.id)
    .single()

  if (findError || !trip) return res.status(404).json({ error: 'Trip not found' })
  if (trip.sacco_id !== req.profile.sacco_id) {
    return res.status(403).json({ error: 'Trip not in your SACCO' })
  }

  const { data, error } = await supabaseAdmin
    .from('trips')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*, routes(name), vehicles(plate_number), profiles:driver_id(full_name)')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

module.exports = router
