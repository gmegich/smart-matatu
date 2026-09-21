/**
 * Smart Matatu QR / barcode payloads
 * - Payment:  SM|PAY|A1B2C3D4
 * - Access:   SM|ACCESS|passenger|http://localhost:5173/login
 * Plain payment codes (4–12 alnum) are also accepted for backwards compatibility.
 */

export const PAYLOAD = {
  PAY: 'PAY',
  ACCESS: 'ACCESS',
}

export function encodePaymentQr(paymentCode) {
  return `SM|PAY|${String(paymentCode).trim().toUpperCase()}`
}

export function encodeAccessQr(role, baseUrl = typeof window !== 'undefined' ? window.location.origin : '') {
  const url = `${baseUrl}/login?role=${encodeURIComponent(role)}`
  return `SM|ACCESS|${role}|${url}`
}

export function parseScannedValue(raw) {
  const value = String(raw || '').trim()
  if (!value) return { type: 'unknown', raw: value }

  // Structured Smart Matatu payload
  if (value.startsWith('SM|')) {
    const parts = value.split('|')
    const kind = parts[1]

    if (kind === 'PAY' && parts[2]) {
      return { type: 'payment', code: parts[2].trim().toUpperCase(), raw: value }
    }

    if (kind === 'ACCESS' && parts[2]) {
      return {
        type: 'access',
        role: parts[2].trim().toLowerCase(),
        url: parts[3] || null,
        raw: value,
      }
    }
  }

  // Full URL with role query
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const url = new URL(value)
      const role = url.searchParams.get('role')
      if (role) {
        return { type: 'access', role: role.toLowerCase(), url: value, raw: value }
      }
      return { type: 'url', url: value, raw: value }
    }
  } catch {
    // not a URL
  }

  // Plain payment code
  if (/^[A-Z0-9]{4,12}$/i.test(value)) {
    return { type: 'payment', code: value.toUpperCase(), raw: value }
  }

  return { type: 'unknown', raw: value }
}
