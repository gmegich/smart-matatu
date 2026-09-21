import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import AuthLayout from '../../components/AuthLayout'
import BarcodeScanner from '../../components/BarcodeScanner'
import { AUTH_ROLES, ROLE_HOME } from '../../lib/authRoles'
import { encodeAccessQr, parseScannedValue } from '../../lib/qrPayload'
import { useAuth } from '../../context/AuthContext'

/**
 * Public entry: scan an Access QR to open the right login role,
 * or scan a payment QR if already logged in as driver.
 */
export default function ScanAccess() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showPosters, setShowPosters] = useState(false)

  const handleScan = (decodedText) => {
    setError('')
    const parsed = parseScannedValue(decodedText)

    if (parsed.type === 'access' && parsed.role) {
      setInfo(`Opening ${parsed.role} login...`)
      navigate(`/login?role=${encodeURIComponent(parsed.role)}`, { replace: true })
      return
    }

    if (parsed.type === 'url' && parsed.url) {
      try {
        const url = new URL(parsed.url)
        if (url.origin === window.location.origin) {
          navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true })
          return
        }
      } catch {
        // fall through
      }
      window.location.href = parsed.url
      return
    }

    if (parsed.type === 'payment' && parsed.code) {
      if (profile?.role === 'driver') {
        navigate('/driver/verify', { state: { scannedCode: parsed.code } })
        return
      }
      setInfo(`Payment code ${parsed.code} — log in as driver to verify.`)
      navigate('/login?role=driver', { state: { message: `Scan captured code ${parsed.code}. Log in as driver to verify.` } })
      return
    }

    setError('Unrecognized QR / barcode. Use a Smart Matatu Access or Payment code.')
  }

  return (
    <AuthLayout
      title="Scan kuingia / Scan to access"
      subtitle="Elekeza kamera kwenye QR / barcode ya Smart Matatu / Point your camera at a Smart Matatu QR or barcode"
    >
      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-success mb-4">{info}</div>}

      <BarcodeScanner active onScan={handleScan} onError={setError} />

      <p className="mt-3 text-center text-xs text-slate-400">
        Tip: On a computer without a camera, tap <strong>Upload QR image</strong> and select a screenshot of the QR.
      </p>

      <div className="mt-6 space-y-3 text-center text-sm text-slate-500">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
            Ingia / Login
          </Link>
        </p>
        {user && profile && (
          <button
            type="button"
            onClick={() => navigate(ROLE_HOME[profile.role] || '/')}
            className="font-semibold text-emerald-600 hover:underline"
          >
            Continue as {profile.full_name} →
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPosters((v) => !v)}
          className="block w-full text-xs font-semibold text-slate-400 hover:text-emerald-600"
        >
          {showPosters ? 'Hide' : 'Show'} access QR posters
        </button>
      </div>

      {showPosters && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {AUTH_ROLES.map((r) => {
            const payload = encodeAccessQr(r.id)
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="mx-auto flex justify-center bg-white p-2">
                  <QRCodeSVG value={payload} size={96} level="M" />
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-700">{r.label}</p>
                <p className="text-[10px] text-slate-400">Scan to open login</p>
              </div>
            )
          })}
        </div>
      )}
    </AuthLayout>
  )
}
