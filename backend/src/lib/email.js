async function sendViaResend(to, subject, html, text) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'Smart Matatu <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Resend email failed')
  }
  return { ok: true, provider: 'resend', data }
}

async function sendEmail(to, subject, html, text) {
  if (!to) return { ok: false, error: 'No recipient' }

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!recipients.length) return { ok: false, error: 'No recipients' }

  const provider = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase()
  const plainText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  try {
    if (provider === 'resend') {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not set in backend/.env')
      }
      return await sendViaResend(recipients, subject, html, plainText)
    }

    console.log(`[Email mock] To: ${recipients.join(', ')}`)
    console.log(`[Email mock] Subject: ${subject}`)
    console.log(`[Email mock] Body: ${plainText}`)
    return { ok: true, mock: true, to: recipients }
  } catch (err) {
    console.error('Email error:', err.message)
    return { ok: false, error: err.message }
  }
}

module.exports = { sendEmail }
