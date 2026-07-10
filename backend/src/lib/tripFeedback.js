const { supabaseAdmin } = require('../config/supabase')
const { markPaymentCompleted } = require('./tripRating')
const { notifyStaffTripRating } = require('./notifyStaff')

async function getPaymentFeedback(paymentId) {
  const { data, error } = await supabaseAdmin
    .from('trip_ratings')
    .select('id, rating, comment, created_at')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error?.message?.includes('trip_ratings') || error?.code === '42P01') {
    return { data: null, tableMissing: true }
  }
  if (error) return { data: null, error: error.message }
  return { data }
}

async function adminSubmitTripFeedback(paymentId, userId, rating, comment) {
  const score = Number(rating)
  if (Number.isNaN(score) || score < 1 || score > 5) {
    return { success: false, error: 'Rating must be between 1 and 5 stars' }
  }

  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('id, status, trip_id, passenger_id')
    .eq('id', paymentId)
    .eq('passenger_id', userId)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError.message }
  if (!payment) return { success: false, error: 'Payment not found' }

  if (payment.status === 'pending') {
    return { success: false, error: 'Wait for driver to verify payment before giving feedback' }
  }

  const existing = await getPaymentFeedback(paymentId)
  if (existing.tableMissing) {
    return {
      success: false,
      error: 'Feedback table missing. Run supabase/add-trip-feedback.sql in Supabase SQL Editor.',
    }
  }
  if (existing.data) {
    return { success: false, error: 'You already submitted feedback for this trip' }
  }

  if (payment.status === 'verified') {
    const arrive = await markPaymentCompleted(paymentId)
    if (!arrive.success) return arrive
  } else if (payment.status !== 'completed') {
    return { success: false, error: 'Trip must be verified or completed before feedback' }
  }

  let driverId = null
  if (payment.trip_id) {
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select('driver_id')
      .eq('id', payment.trip_id)
      .maybeSingle()
    driverId = trip?.driver_id || null
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('trip_ratings')
    .insert({
      payment_id: paymentId,
      trip_id: payment.trip_id,
      passenger_id: userId,
      driver_id: driverId,
      rating: score,
      comment: comment?.trim() || null,
    })
    .select('id, rating, comment, created_at')
    .single()

  if (insertError) {
    if (insertError.message?.includes('trip_ratings') || insertError.code === '42P01') {
      return {
        success: false,
        error: 'Feedback table missing. Run supabase/add-trip-feedback.sql in Supabase SQL Editor.',
      }
    }
    return { success: false, error: insertError.message }
  }

  notifyStaffTripRating(paymentId, score, comment)

  return {
    success: true,
    feedback: inserted,
    rating: inserted.rating,
    comment: inserted.comment,
  }
}

async function passengerNeedsAction(passengerId) {
  const { data: open, error: openErr } = await supabaseAdmin
    .from('payments')
    .select('id, payment_code, status, routes(name)')
    .eq('passenger_id', passengerId)
    .in('status', ['pending', 'verified'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (openErr) throw openErr
  if (open?.length) return { type: 'open_trip', trip: open[0] }

  const { data: completed, error: compErr } = await supabaseAdmin
    .from('payments')
    .select('id, payment_code, status, routes(name), trip_ratings(id)')
    .eq('passenger_id', passengerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (compErr) {
    if (compErr.message?.includes('trip_ratings')) {
      return { type: 'none' }
    }
    throw compErr
  }

  const needsFeedback = (completed || []).find((p) => {
    const r = p.trip_ratings
    return !r || (Array.isArray(r) && r.length === 0)
  })

  if (needsFeedback) {
    return { type: 'needs_feedback', trip: needsFeedback }
  }

  return { type: 'none' }
}

async function assertNoOpenTrip(passengerId) {
  const need = await passengerNeedsAction(passengerId)

  if (need.type === 'open_trip') {
    const err = new Error(
      'Una safari hai — maliza safari yako kwanza kabla ya kulipa nyingine. / Complete your current trip before paying for another.'
    )
    err.status = 400
    err.openTrip = need.trip
    throw err
  }

  if (need.type === 'needs_feedback') {
    const err = new Error(
      'Toa maoni na ukadirie safari yako kwanza / Submit trip feedback and rating before paying for another trip.'
    )
    err.status = 400
    err.needsFeedback = need.trip
    throw err
  }
}

module.exports = {
  adminSubmitTripFeedback,
  getPaymentFeedback,
  passengerNeedsAction,
  assertNoOpenTrip,
}
