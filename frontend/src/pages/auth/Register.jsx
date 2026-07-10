import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PUBLIC_REGISTER_ROLES, ROLE_HOME } from '../../lib/authRoles'
import PasswordInput from '../../components/PasswordInput'

export default function Register() {
  const [role, setRole] = useState('passenger')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const selectedRole = PUBLIC_REGISTER_ROLES.find((r) => r.id === role)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await signUp(email, password, fullName, role, phone)
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data?.session) {
      navigate(ROLE_HOME[role] || '/')
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 via-green-800 to-red-800 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Jisajili / Register</h1>
          <p className="text-sm text-gray-500">Unda akaunti mpya / Create a new account</p>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-center text-sm font-medium text-gray-700">
            Chagua aina ya mtumiaji / Select user type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PUBLIC_REGISTER_ROLES.map((r) => (
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
          <p className="mt-2 text-center text-xs text-gray-400">
            Admin &amp; owner accounts are created by SACCO admin only.
          </p>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
            Account created! You can log in now.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone / Simu {(role === 'passenger' || role === 'driver') && <span className="text-red-500">*</span>}
              </label>
              <input
                type="tel"
                required={role === 'passenger' || role === 'driver'}
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              />
              <p className="mt-1 text-xs text-gray-500">For SMS when matatu is 2 min away &amp; driver contact</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Inasajili...' : `Jisajili kama ${selectedRole?.label}`}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Una akaunti?{' '}
          <Link to="/login" className="font-semibold text-green-600 hover:underline">
            Ingia / Login
          </Link>
        </p>
      </div>
    </div>
  )
}
