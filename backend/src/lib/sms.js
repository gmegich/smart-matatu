function normalizePhone(phone) {
  if (!phone) return null
  let p = String(phone).replace(/\s+/g, '').replace(/^\+/, '')
  if (p.startsWith('0')) p = `254${p.slice(1)}`
  if (/^\d{9}$/.test(p)) p = `254${p}`
  return p
}

async function sendViaAfricasTalking(to, message) {
  const username = process.env.AFRICASTALKING_USERNAME
  const apiKey = process.env.AFRICASTALKING_API_KEY
  const from = process.env.AFRICASTALKING_SENDER || 'SmartMatatu'

  const body = new URLSearchParams({
    username,
    to: `+${to}`,
    message,
    from,
  })

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.SMSMessageData?.Message || data?.error || 'Africa\'s Talking SMS failed')
  }
  return { ok: true, provider: 'africastalking', data }
}

async function sendViaTwilio(to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const body = new URLSearchParams({
    To: `+${to}`,
    From: from,
    Body: message,
  })

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'Twilio SMS failed')
  }
  return { ok: true, provider: 'twilio', data }
}

async function sendSms(phone, message) {
  const to = normalizePhone(phone)
  if (!to) {
    return { ok: false, error: 'No phone number' }
  }

  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase()

  try {
    if (provider === 'africastalking') {
      return await sendViaAfricasTalking(to, message)
    }
    if (provider === 'twilio') {
      return await sendViaTwilio(to, message)
    }
    console.log(`[SMS mock] +${to}: ${message}`)
    return { ok: true, mock: true, to }
  } catch (err) {
    console.error('SMS error:', err.message)
    return { ok: false, error: err.message }
  }
}

module.exports = { sendSms, normalizePhone }
