const express = require('express')
const { supabaseAdmin } = require('../config/supabase')
const { authenticate, loadProfile, requireRole } = require('../middleware/auth')
const { haversineKm, etaMinutes } = require('../lib/geo')
const { sendSms } = require('../lib/sms')
const { notifyStaffEtaAlert } = require('../lib/notifyStaff')

const router = express.Router()

const ETA_THRESHOLD_MIN = Number(process.env.SMS_ETA_MINUTES) || 2

async function fetchDriverForPayment(payment) {
  let driverId = payment.trip?.driver_id
  if (!driverId && payment.trip_id) {
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select('driver_id')
      .eq('id', payment.trip_id)
      .maybeSingle()
    driverId = trip?.driver_id
  }
  if (!driverId) return null
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', driverId)
    .maybeSingle()
  return data
}

router.post('/eta-check', authenticate, loadProfile, requireRole('passenger'), async (req, res) => {
  const { payment_id } = req.body
  if (!payment_id) return res.status(400).json({ error: 'payment_id is required' })

  const { data: payment, error: payError } = await supabaseAdmin
    .from('payments')
    .select(
      `id, passenger_id, vehicle_id, trip_id, payment_code, status,
       from_stage:from_stage_id(name, latitude, longitude),
       vehicles(plate_number),
       trip:trips(driver_id)`
    )
    .eq('id', payment_id)
    .eq('passenger_id', req.user.id)
    .maybeSingle()

  if (payError) return res.status(400).json({ error: payError.message })
  if (!payment) return res.status(404).json({ error: 'Payment not found' })
  if (!payment.vehicle_id) {
    return res.json({ eta_minutes: null, sms_sent: false, reason: 'No vehicle linked yet' })
  }

  const stage = payment.from_stage
  if (!stage?.latitude || !stage?.longitude) {
    return res.json({ eta_minutes: null, sms_sent: false, reason: 'Pickup stage has no GPS coordinates' })
  }

  const { data: location } = await supabaseAdmin
    .from('vehicle_locations')
    .select('latitude, longitude, updated_at')
    .eq('vehicle_id', payment.vehicle_id)
    .maybeSingle()

  if (!location) {
    return res.json({ eta_minutes: null, sms_sent: false, reason: 'Matatu GPS not available yet' })
  }

  const distanceKm = haversineKm(
    Number(location.latitude),
    Number(location.longitude),
    Number(stage.latitude),
    Number(stage.longitude)
  )
  const eta = Math.round(etaMinutes(distanceKm) * 10) / 10

  const [{ data: passenger }, driverProfile] = await Promise.all([
    supabaseAdmin.from('profiles').select('full_name, phone').eq('id', req.user.id).single(),
    fetchDriverForPayment(payment),
  ])

  const driverPhone = driverProfile?.phone
  const plate = payment.vehicles?.plate_number || 'matatu'

  let sms_sent = false
  let sms_message = null

  if (eta <= ETA_THRESHOLD_MIN) {
    const { data: existing } = await supabaseAdmin
      .from('sms_notifications')
      .select('id')
      .eq('payment_id', payment_id)
      .eq('notification_type', 'eta_2min')
      .maybeSingle()

    if (!existing && passenger?.phone) {
      sms_message =
        `Smart Matatu: ${plate} is ~${Math.max(1, Math.round(eta))} min from ${stage.name}. ` +
        `Payment ${payment.payment_code}. ` +
        (driverPhone ? `Call driver: ${driverPhone}` : 'Prepare to board.')

      const result = await sendSms(passenger.phone, sms_message)
      if (result.ok) {
        await supabaseAdmin.from('sms_notifications').insert({
          payment_id,
          user_id: req.user.id,
          notification_type: 'eta_2min',
          message: sms_message,
        })
        sms_sent = true
        notifyStaffEtaAlert(payment_id, {
          eta,
          plate,
          pickupStage: stage.name,
          smsMessage: sms_message,
        })
      }
    } else if (existing) {
      sms_sent = true
    }
  }

  res.json({
    eta_minutes: eta,
    distance_km: Math.round(distanceKm * 100) / 100,
    threshold_minutes: ETA_THRESHOLD_MIN,
    sms_sent,
    sms_message: sms_sent ? sms_message : null,
    driver: driverProfile,
    pickup_stage: stage.name,
    plate,
  })
})

module.exports = router
