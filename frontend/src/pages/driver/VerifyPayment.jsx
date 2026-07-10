import { useState } from 'react'
import Layout from '../../components/Layout'
import PhoneContact from '../../components/PhoneContact'
import { formatCurrency } from '../../lib/supabase'
import { verifyPayment, getApiErrorMessage } from '../../lib/api'

export default function VerifyPayment() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await verifyPayment(code.trim())
      setResult(data)
      setCode('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Thibitisha Malipo / Verify Payment">
      <div className="mx-auto max-w-md">
        <p className="mb-6 text-sm text-gray-600">
          Ingiza msimbo wa malipo kutoka kwa abiria kabla ya kumpa kiti.
        </p>

        <form onSubmit={handleVerify} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-sm font-medium">Msimbo wa Malipo</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              className="w-full rounded-lg border px-4 py-3 text-center font-mono text-xl tracking-widest uppercase"
              maxLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Inathibitisha...' : 'Thibitisha / Verify'}
          </button>
        </form>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="text-4xl">✅</div>
              <h3 className="mt-2 text-lg font-bold text-green-800">Malipo Yamethibitishwa!</h3>
              <p className="text-green-700">{formatCurrency(result.amount)}</p>
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
