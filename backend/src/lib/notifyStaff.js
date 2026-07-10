const { supabaseAdmin } = require('../config/supabase')
const { sendEmail } = require('./email')

async function getPaymentContext(paymentId) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(`
      id, payment_code, amount, sacco_id,
      passenger:passenger_id(full_name, email),
      routes(name),
      vehicles(plate_number, owner_id, owner:owner_id(email, full_name)),
      from_stage:from_stage_id(name),
      to_stage:to_stage_id(name)
    `)
    .eq('id', paymentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

async function getStaffRecipients(saccoId, ownerId) {
  const emails = new Map()

  if (ownerId) {
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', ownerId)
      .maybeSingle()
    if (owner?.email) {
      emails.set(owner.email, owner.full_name || 'Vehicle Owner')
    }
  }

  if (saccoId) {
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('sacco_id', saccoId)
      .eq('role', 'admin')

    ;(admins || []).forEach((admin) => {
      if (admin.email) emails.set(admin.email, admin.full_name || 'Admin')
    })
  }

  return [...emails.entries()].map(([email, name]) => ({ email, name }))
}

function buildTripSummary(payment) {
  const route = payment.routes?.name || 'Unknown route'
  const plate = payment.vehicles?.plate_number || 'N/A'
  const from = payment.from_stage?.name || '?'
  const to = payment.to_stage?.name || '?'
  const passenger = payment.passenger?.full_name || 'Passenger'
  const code = payment.payment_code || payment.id
  return { route, plate, from, to, passenger, code }
}

async function notifyStaffEtaAlert(paymentId, { eta, plate, pickupStage, smsMessage }) {
  try {
    const payment = await getPaymentContext(paymentId)
    if (!payment) return

    const ownerId = payment.vehicles?.owner_id
    const recipients = await getStaffRecipients(payment.sacco_id, ownerId)
    if (!recipients.length) return

    const { route, from, to, passenger, code } = buildTripSummary(payment)
    const subject = `Matatu ETA alert — ${plate || payment.vehicles?.plate_number || 'vehicle'} (~${eta} min)`
    const html = `
      <h2>Smart Matatu — ETA Notification</h2>
      <p>A passenger SMS alert was sent because the matatu is arriving soon.</p>
      <ul>
        <li><strong>Passenger:</strong> ${passenger}</li>
        <li><strong>Route:</strong> ${route} (${from} → ${to})</li>
        <li><strong>Vehicle:</strong> ${plate || payment.vehicles?.plate_number || 'N/A'}</li>
        <li><strong>Payment code:</strong> ${code}</li>
        <li><strong>ETA:</strong> ~${eta} min from ${pickupStage || from}</li>
      </ul>
      <p><strong>SMS sent:</strong> ${smsMessage || 'N/A'}</p>
    `
    const text =
      `Smart Matatu ETA alert\n` +
      `Passenger: ${passenger}\n` +
      `Route: ${route} (${from} → ${to})\n` +
      `Vehicle: ${plate || payment.vehicles?.plate_number || 'N/A'}\n` +
      `Code: ${code}\n` +
      `ETA: ~${eta} min from ${pickupStage || from}\n` +
      `SMS: ${smsMessage || 'N/A'}`

    await Promise.all(
      recipients.map((r) => sendEmail(r.email, subject, html, text))
    )
  } catch (err) {
    console.error('notifyStaffEtaAlert:', err.message)
  }
}

async function notifyStaffTripRating(paymentId, rating, comment) {
  try {
    const payment = await getPaymentContext(paymentId)
    if (!payment) return

    const ownerId = payment.vehicles?.owner_id
    const recipients = await getStaffRecipients(payment.sacco_id, ownerId)
    if (!recipients.length) return

    const { route, plate, from, to, passenger, code } = buildTripSummary(payment)
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
    const subject = `New passenger rating — ${rating}/5 stars (${plate})`
    const html = `
      <h2>Smart Matatu — Passenger Rating</h2>
      <p>A passenger submitted trip feedback.</p>
      <ul>
        <li><strong>Passenger:</strong> ${passenger}</li>
        <li><strong>Rating:</strong> ${rating}/5 ${stars}</li>
        <li><strong>Comment:</strong> ${comment?.trim() || '(none)'}</li>
        <li><strong>Route:</strong> ${route} (${from} → ${to})</li>
        <li><strong>Vehicle:</strong> ${plate}</li>
        <li><strong>Payment code:</strong> ${code}</li>
      </ul>
    `
    const text =
      `Smart Matatu — Passenger Rating\n` +
      `Passenger: ${passenger}\n` +
      `Rating: ${rating}/5\n` +
      `Comment: ${comment?.trim() || '(none)'}\n` +
      `Route: ${route} (${from} → ${to})\n` +
      `Vehicle: ${plate}\n` +
      `Code: ${code}`

    await Promise.all(
      recipients.map((r) => sendEmail(r.email, subject, html, text))
    )
  } catch (err) {
    console.error('notifyStaffTripRating:', err.message)
  }
}

module.exports = { notifyStaffEtaAlert, notifyStaffTripRating }
