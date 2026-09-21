import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AUTH_ROLES, ROLE_HOME } from '../../lib/authRoles'
import PasswordInput from '../../components/PasswordInput'
import AuthLayout from '../../components/AuthLayout'

export default function Login() {
  const [searchParams] = useSearchParams()
  const roleFromUrl = searchParams.get('role')
  const initialRole = AUTH_ROLES.some((r) => r.id === roleFromUrl) ? roleFromUrl : 'passenger'

  const [role, setRole] = useState(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const resetMessage = location.state?.message

  useEffect(() => {
    if (roleFromUrl && AUTH_ROLES.some((r) => r.id === roleFromUrl)) {
      setRole(roleFromUrl)
    }
  }, [roleFromUrl])

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
    <AuthLayout title="Karibu tena / Welcome back" subtitle="Ingia kwenye akaunti yako / Sign in to your account">
      <div className="mb-6">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 lg:text-left">
          Chagua aina ya mtumiaji
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
              className={`rounded-xl border-2 p-2.5 text-center transition-all duration-150 ${
                role === r.id
                  ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                  : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-white'
              }`}
            >
              <span className="text-2xl">{r.icon}</span>
              <p className="mt-1 text-[11px] font-bold leading-tight text-slate-700">{r.label}</p>
            </button>
          ))}
        </div>
        {selectedRole && (
          <p className="mt-2.5 text-center text-xs text-slate-400 lg:text-left">{selectedRole.hint}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {resetMessage && <div className="alert-success">{resetMessage}</div>}
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
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="label-field mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline">
              Sahau nenosiri? / Forgot?
            </Link>
          </div>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Inaingia / Signing in...' : `Ingia / Login as ${selectedRole?.label}`}
        </button>
      </form>

      {role === 'passenger' ? (
        <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
          <p>
            Mtu mpya?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
              Jisajili / Register
            </Link>
          </p>
          <Link to="/scan" className="block text-xs font-semibold text-emerald-600 hover:underline">
            📷 Scan QR to access / Scan kuingia
          </Link>
        </div>
      ) : role === 'owner' ? (
        <div className="mt-6 space-y-2 text-center text-xs text-slate-400">
          <p>Akaunti za mmiliki huundwa na admin. / Owner accounts are created by admin.</p>
          <Link to="/scan" className="block font-semibold text-emerald-600 hover:underline">
            📷 Scan QR to access
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2 text-center text-xs text-slate-400">
          <p>
            Mtu mpya?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
              Jisajili / Register
            </Link>
          </p>
          {selectedRole?.demo && (
            <button type="button" onClick={fillDemo} className="font-semibold text-emerald-600 hover:underline">
              Tumia demo / Use demo account
            </button>
          )}
          <Link to="/scan" className="block font-semibold text-emerald-600 hover:underline">
            📷 Scan QR to access
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
