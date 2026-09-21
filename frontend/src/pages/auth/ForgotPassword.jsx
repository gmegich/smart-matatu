import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, getApiErrorMessage } from '../../lib/api'
import AuthLayout from '../../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sahau nenosiri? / Forgot password?" subtitle="Forgot your password — we'll email a reset link">
      {success ? (
        <div className="space-y-4 text-center">
          <div className="alert-success text-left">
            <p className="font-semibold">Angalia barua pepe yako / Check your email</p>
            <p className="mt-2">
              If an account exists for <strong>{email}</strong>, we sent a link to reset your password.
            </p>
          </div>
          <Link to="/login" className="inline-block text-sm font-semibold text-emerald-600 hover:underline">
            ← Rudi kwenye kuingia / Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">
            Ingiza barua pepe uliyosajili nayo. Tutakutumia kiungo cha kubadilisha nenosiri.
          </p>
          {error && <div className="alert-error">{error}</div>}
          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Inatuma...' : 'Tuma kiungo / Send reset link'}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
              ← Rudi kwenye kuingia / Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
