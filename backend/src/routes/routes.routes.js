const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')
const cache = require('../lib/cache')

const router = express.Router()
const ROUTES_TTL = 60_000

function bustRouteCaches(routeId) {
  cache.del('routes:')
  if (routeId) {
    cache.del(`stages:${routeId}`)
    cache.del(`fares:${routeId}`)
  }
}

router.get('/', authenticate, loadProfile, async (req, res) => {
  const cacheKey =
    req.profile.role === 'admin'
      ? `routes:admin:${req.profile.sacco_id}`
      : 'routes:active'

  const cached = cache.get(cacheKey)
  if (cached) {
    res.set('Cache-Control', 'private, max-age=30')
    return res.json(cached)
  }

  let query = supabaseAdmin
    .from('routes')
    .select('id, name, description, sacco_id, is_active, saccos(name)')
    .eq('is_active', true)

  if (req.profile.role === 'admin') {
    query = supabaseAdmin
      .from('routes')
      .select('id, name, description, sacco_id, is_active, saccos(name)')
      .eq('sacco_id', req.profile.sacco_id)
  }

  const { data, error } = await query
  if (error) return res.status(400).json({ error: error.message })
  cache.set(cacheKey, data, ROUTES_TTL)
  res.set('Cache-Control', 'private, max-age=30')
  res.json(data)
})

router.get('/:id/stages', authenticate, loadProfile, async (req, res) => {
  const cacheKey = `stages:${req.params.id}`
  const cached = cache.get(cacheKey)
  if (cached) {
    res.set('Cache-Control', 'private, max-age=30')
    return res.json(cached)
  }

  const { data, error } = await supabaseAdmin
    .from('route_stages')
    .select('id, route_id, name, order_index, latitude, longitude')
    .eq('route_id', req.params.id)
    .order('order_index')

  if (error) return res.status(400).json({ error: error.message })
  cache.set(cacheKey, data, ROUTES_TTL)
  res.set('Cache-Control', 'private, max-age=30')
  res.json(data)
})

router.get('/:id/fares', authenticate, loadProfile, async (req, res) => {
  const cacheKey = `fares:${req.params.id}`
  const cached = cache.get(cacheKey)
  if (cached) {
    res.set('Cache-Control', 'private, max-age=30')
    return res.json(cached)
  }

  const { data, error } = await supabaseAdmin
    .from('stage_fares')
    .select('id, route_id, fare_amount, from_stage_id, to_stage_id, from_stage:from_stage_id(name), to_stage:to_stage_id(name)')
    .eq('route_id', req.params.id)

  if (error) return res.status(400).json({ error: error.message })
  cache.set(cacheKey, data, ROUTES_TTL)
  res.set('Cache-Control', 'private, max-age=30')
  res.json(data)
})

router.post('/', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { name, description } = req.body
  const { data, error } = await supabaseAdmin
    .from('routes')
    .insert({ name, description, sacco_id: req.profile.sacco_id })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  bustRouteCaches(data?.id)
  res.status(201).json(data)
})

router.post('/:id/stages', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { name, order_index, latitude, longitude } = req.body
  const { data, error } = await supabaseAdmin
    .from('route_stages')
    .insert({
      route_id: req.params.id,
      name,
      order_index,
      latitude: latitude || null,
      longitude: longitude || null,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  bustRouteCaches(req.params.id)
  res.status(201).json(data)
})

router.post('/:id/fares', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { from_stage_id, to_stage_id, fare_amount } = req.body
  const { data, error } = await supabaseAdmin
    .from('stage_fares')
    .insert({
      route_id: req.params.id,
      from_stage_id,
      to_stage_id,
      fare_amount,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  bustRouteCaches(req.params.id)
  res.status(201).json(data)
})

async function assertAdminRoute(req, routeId) {
  const { data, error } = await supabaseAdmin
    .from('routes')
    .select('id, sacco_id')
    .eq('id', routeId)
    .single()
  if (error || !data) throw new Error('Route not found')
  if (data.sacco_id !== req.profile.sacco_id) throw new Error('Route not in your SACCO')
  return data
}

router.patch('/:id', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  try {
    await assertAdminRoute(req, req.params.id)
    const { name, description, is_active } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('routes')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(req.params.id)
    res.json(data)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.delete('/:id', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  try {
    await assertAdminRoute(req, req.params.id)
    const { error } = await supabaseAdmin
      .from('routes')
      .update({ is_active: false })
      .eq('id', req.params.id)
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(req.params.id)
    res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.patch('/stages/:stageId', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { name, order_index, latitude, longitude } = req.body
  const { data: stage, error: stageError } = await supabaseAdmin
    .from('route_stages')
    .select('id, route_id')
    .eq('id', req.params.stageId)
    .single()
  if (stageError || !stage) return res.status(404).json({ error: 'Stage not found' })

  try {
    await assertAdminRoute(req, stage.route_id)
    const updates = {}
    if (name !== undefined) updates.name = name
    if (order_index !== undefined) updates.order_index = order_index
    if (latitude !== undefined) updates.latitude = latitude
    if (longitude !== undefined) updates.longitude = longitude

    const { data, error } = await supabaseAdmin
      .from('route_stages')
      .update(updates)
      .eq('id', req.params.stageId)
      .select()
      .single()
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(stage.route_id)
    res.json(data)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.delete('/stages/:stageId', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { data: stage, error: stageError } = await supabaseAdmin
    .from('route_stages')
    .select('id, route_id')
    .eq('id', req.params.stageId)
    .single()
  if (stageError || !stage) return res.status(404).json({ error: 'Stage not found' })

  try {
    await assertAdminRoute(req, stage.route_id)
    const { error } = await supabaseAdmin.from('route_stages').delete().eq('id', req.params.stageId)
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(stage.route_id)
    res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.patch('/fares/:fareId', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { fare_amount, from_stage_id, to_stage_id } = req.body
  const { data: fare, error: fareError } = await supabaseAdmin
    .from('stage_fares')
    .select('id, route_id')
    .eq('id', req.params.fareId)
    .single()
  if (fareError || !fare) return res.status(404).json({ error: 'Fare not found' })

  try {
    await assertAdminRoute(req, fare.route_id)
    const updates = {}
    if (fare_amount !== undefined) updates.fare_amount = fare_amount
    if (from_stage_id !== undefined) updates.from_stage_id = from_stage_id
    if (to_stage_id !== undefined) updates.to_stage_id = to_stage_id

    const { data, error } = await supabaseAdmin
      .from('stage_fares')
      .update(updates)
      .eq('id', req.params.fareId)
      .select('*, from_stage:from_stage_id(name), to_stage:to_stage_id(name)')
      .single()
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(fare.route_id)
    res.json(data)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

router.delete('/fares/:fareId', authenticate, loadProfile, requireRole('admin'), async (req, res) => {
  const { data: fare, error: fareError } = await supabaseAdmin
    .from('stage_fares')
    .select('id, route_id')
    .eq('id', req.params.fareId)
    .single()
  if (fareError || !fare) return res.status(404).json({ error: 'Fare not found' })

  try {
    await assertAdminRoute(req, fare.route_id)
    const { error } = await supabaseAdmin.from('stage_fares').delete().eq('id', req.params.fareId)
    if (error) return res.status(400).json({ error: error.message })
    bustRouteCaches(fare.route_id)
    res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

module.exports = router
