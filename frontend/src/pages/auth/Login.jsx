import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AUTH_ROLES, ROLE_HOME } from '../../lib/authRoles'
import PasswordInput from '../../components/PasswordInput'

export default function Login() {
  const [role, setRole] = useState('passenger')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const resetMessage = location.state?.message

  const selectedRole = AUTH_ROLES.find((r) => r.id === role)

  const fillDemo = () => {
    if (!selectedRole?.demo) return
    setEmail(selectedRole.demo.email)
    setPassword(selectedRole.demo.password)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await signIn(email, password)
    setLoading(false)

    if (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('wrong email')) {
        setError('Wrong email or password — or no account yet.')
      } else {
        setError(msg)
      }
      return
    }

    const accountRole = data?.profile?.role
    if (accountRole !== role) {
      await signOut()
      const actual = AUTH_ROLES.find((r) => r.id === accountRole)?.label || accountRole || 'another type'
      setError(`This account is ${actual}. Select that user type above or use a different email.`)
      return
    }

    navigate(ROLE_HOME[role] || '/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 via-green-800 to-red-800 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            🚌
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Matatu</h1>
          <p className="text-sm text-gray-500">Nakuru Fare & Tracking System</p>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-center text-sm font-medium text-gray-700">
            Chagua aina ya mtumiaji / Select user type
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AUTH_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id)
                  setError('')
                }}
                className={`rounded-xl border-2 p-2.5 text-center transition ${
                  role === r.id
                    ? 'border-green-600 bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <p className="mt-1 text-[11px] font-semibold leading-tight text-gray-800">{r.label}</p>
              </button>
            ))}
          </div>
          {selectedRole && (
            <p className="mt-2 text-center text-xs text-gray-500">{selectedRole.hint}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMessage && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{resetMessage}</div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
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
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-green-600 hover:underline">
                Sahau nenosiri? / Forgot?
              </Link>
            </div>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Inaingia...' : `Ingia / Login as ${selectedRole?.label}`}
          </button>
        </form>

        {role === 'passenger' ? (
          <p className="mt-6 text-center text-sm text-gray-600">
            Mtu mpya?{' '}
            <Link to="/register" className="font-semibold text-green-600 hover:underline">
              Jisajili / Register
            </Link>
          </p>
        ) : role === 'owner' ? (
          <p className="mt-6 text-center text-xs text-gray-500">
            Akaunti za mmiliki huundwa na admin. / Owner accounts are created by admin.
          </p>
        ) : (
          <div className="mt-6 space-y-2 text-center text-xs text-gray-500">
            <p>
              Mtu mpya?{' '}
              <Link to="/register" className="font-semibold text-green-600 hover:underline">
                Jisajili / Register
              </Link>
            </p>
            {selectedRole?.demo && (
              <button
                type="button"
                onClick={fillDemo}
                className="font-semibold text-green-600 hover:underline"
              >
                Tumia demo / Use demo account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
