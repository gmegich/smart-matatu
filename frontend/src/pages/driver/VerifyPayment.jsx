import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import PhoneContact from '../../components/PhoneContact'
import BarcodeScanner from '../../components/BarcodeScanner'
import { formatCurrency } from '../../lib/supabase'
import { verifyPayment, getApiErrorMessage } from '../../lib/api'
import { parseScannedValue } from '../../lib/qrPayload'

export default function VerifyPayment() {
  const location = useLocation()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('scan') // scan | type
  const [scanFlash, setScanFlash] = useState('')

  const runVerify = async (rawCode) => {
    const cleaned = String(rawCode || '').trim().toUpperCase()
    if (cleaned.length < 4) {
      setError('Invalid payment code')
      return
    }

    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await verifyPayment(cleaned)
      setResult(data)
      setCode('')
      setScanFlash(`Verified ${cleaned}`)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const scanned = location.state?.scannedCode
    if (scanned) {
      setMode('type')
      setCode(scanned)
      runVerify(scanned)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerify = async (e) => {
    e.preventDefault()
    await runVerify(code)
  }

  const handleScan = async (decodedText) => {
    if (loading) return
    const parsed = parseScannedValue(decodedText)

    if (parsed.type === 'payment' && parsed.code) {
      setScanFlash(`Scanned: ${parsed.code}`)
      setCode(parsed.code)
      await runVerify(parsed.code)
      return
    }

    setError('Unrecognized code. Scan a Smart Matatu payment QR or enter the code manually.')
  }

  return (
    <Layout title="Thibitisha Malipo / Verify Payment">
      <div className="mx-auto max-w-lg">
        <p className="mb-5 text-sm text-slate-500">
          Scan the passenger&apos;s QR / barcode, or type the payment code before boarding.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('scan')}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === 'scan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            📷 Scan QR / Barcode
          </button>
          <button
            type="button"
            onClick={() => setMode('type')}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === 'type' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            ⌨️ Type code
          </button>
        </div>

        <div className="card space-y-4 p-5 sm:p-6">
          {error && <div className="alert-error">{error}</div>}
          {scanFlash && !error && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
              {scanFlash}
            </div>
          )}
          {loading && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
              Inathibitisha... / Verifying...
            </div>
          )}

          {mode === 'scan' ? (
            <BarcodeScanner
              active={mode === 'scan'}
              paused={loading}
              onScan={handleScan}
              onError={setError}
            />
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label-field">Msimbo wa Malipo</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="input-field text-center font-mono text-xl tracking-widest uppercase"
                  maxLength={12}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Inathibitisha / Verifying...' : 'Thibitisha / Verify'}
              </button>
            </form>
          )}
        </div>

        {result && (
          <div className="mt-6 space-y-4 animate-fade-up">
            <div className="card border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-2 text-lg font-extrabold text-emerald-800">Malipo Yamethibitishwa!</h3>
              <p className="text-emerald-700">{formatCurrency(result.amount)}</p>
            </div>
            {result.passenger && (
              <PhoneContact
                label="Abiria / Passenger"
                name={result.passenger.full_name}
                phone={result.passenger.phone}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
