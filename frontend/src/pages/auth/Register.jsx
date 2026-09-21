import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PUBLIC_REGISTER_ROLES, ROLE_HOME } from '../../lib/authRoles'
import PasswordInput from '../../components/PasswordInput'
import AuthLayout from '../../components/AuthLayout'

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
    <AuthLayout title="Jisajili / Register" subtitle="Unda akaunti mpya / Create a new account">
      <div className="mb-6">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 lg:text-left">
          Chagua aina ya mtumiaji
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
        <p className="mt-2 text-center text-xs text-slate-400 lg:text-left">
          Admin &amp; owner accounts are created by SACCO admin only.
        </p>
      </div>

      {success ? (
        <div className="alert-success text-center">Account created! You can log in now.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="alert-error">{error}</div>}
          <div>
            <label className="label-field">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">
              Phone / Simu {(role === 'passenger' || role === 'driver') && <span className="text-red-500">*</span>}
            </label>
            <input
              type="tel"
              required={role === 'passenger' || role === 'driver'}
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
            <p className="mt-1.5 text-xs text-slate-400">For SMS when matatu is 2 min away &amp; driver contact</p>
          </div>
          <div>
            <label className="label-field">Password</label>
            <PasswordInput
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Inasajili / Registering...' : `Jisajili / Register as ${selectedRole?.label}`}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Una akaunti?{' '}
        <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline">
          Ingia / Login
        </Link>
      </p>
    </AuthLayout>
  )
}
