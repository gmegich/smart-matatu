const { supabaseAdmin } = require('../config/supabase')

async function fetchPassengerPayment(paymentId, userId, withArrived = true) {
  const columns = withArrived ? 'id, status, arrived_at' : 'id, status'
  const result = await supabaseAdmin
    .from('payments')
    .select(columns)
    .eq('id', paymentId)
    .eq('passenger_id', userId)
    .maybeSingle()

  if (result.error?.message?.includes('arrived_at') && withArrived) {
    return fetchPassengerPayment(paymentId, userId, false)
  }

  return result
}

async function markPaymentCompleted(paymentId) {
  const arrived_at = new Date().toISOString()

  let { error } = await supabaseAdmin
    .from('payments')
    .update({ arrived_at, status: 'completed' })
    .eq('id', paymentId)

  if (error?.message?.includes('arrived_at')) {
    ;({ error } = await supabaseAdmin
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', paymentId))
    if (error) return { success: false, error: error.message }
    return { success: true, arrived_at: null, status: 'completed', status_only: true }
  }

  if (error) return { success: false, error: error.message }
  return { success: true, arrived_at, status: 'completed' }
}

async function adminPassengerArrive(paymentId, userId) {
  const { data: payment, error: fetchError } = await fetchPassengerPayment(paymentId, userId)

  if (fetchError) return { success: false, error: fetchError.message }
  if (!payment) return { success: false, error: 'Payment not found' }

  if (payment.arrived_at || payment.status === 'completed') {
    return {
      success: true,
      already_arrived: true,
      arrived_at: payment.arrived_at || null,
      status: payment.status,
    }
  }

  if (payment.status !== 'verified') {
    return {
      success: false,
      error: 'Malipo lazima yathibitishwe na dereva kwanza / Payment must be verified by driver first',
    }
  }

  const result = await markPaymentCompleted(paymentId)
  if (!result.success) return result

  return {
    success: true,
    payment_id: paymentId,
    arrived_at: result.arrived_at,
    status: result.status,
  }
}

module.exports = { adminPassengerArrive, markPaymentCompleted }
