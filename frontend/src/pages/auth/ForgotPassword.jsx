import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, getApiErrorMessage } from '../../lib/api'

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 via-green-800 to-red-800 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            🔑
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sahau Nenosiri?</h1>
          <p className="text-sm text-gray-500">Forgot your password</p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Angalia barua pepe yako / Check your email</p>
              <p className="mt-2">
                If an account exists for <strong>{email}</strong>, we sent a link to reset your password.
              </p>
            </div>
            <Link to="/login" className="inline-block text-sm font-semibold text-green-600 hover:underline">
              ← Rudi kwenye kuingia / Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Ingiza barua pepe uliyosajili nayo. Tutakutumia kiungo cha kubadilisha nenosiri.
            </p>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Inatuma...' : 'Tuma kiungo / Send reset link'}
            </button>
            <p className="text-center text-sm text-gray-600">
              <Link to="/login" className="font-semibold text-green-600 hover:underline">
                ← Rudi kwenye kuingia / Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
