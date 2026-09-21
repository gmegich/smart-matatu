import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../../components/PasswordInput'
import AuthLayout from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'
import { resetPassword, getApiErrorMessage, storeSession } from '../../lib/api'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const initRecoverySession = async () => {
      try {
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        const type = params.get('type')

        if (access_token && refresh_token && type === 'recovery') {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (sessionError) throw sessionError
          if (data.session) storeSession(data.session)
          window.history.replaceState(null, '', window.location.pathname)
          setReady(true)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          storeSession(session)
          setReady(true)
          return
        }

        setError('Invalid or expired reset link. Request a new one from the forgot password page.')
      } catch (err) {
        setError(err.message || 'Could not verify reset link.')
      } finally {
        setChecking(false)
      }
    }

    initRecoverySession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(password)
      await supabase.auth.signOut({ scope: 'local' })
      navigate('/login', { replace: true, state: { message: 'Password updated. You can log in now.' } })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Weka nenosiri jipya / Set new password" subtitle="Set a new password for your account">
      {checking ? (
        <p className="text-center text-sm text-slate-500">Inathibitisha kiungo... / Verifying link...</p>
      ) : !ready ? (
        <div className="space-y-4 text-center">
          <div className="alert-error text-left">{error}</div>
          <Link to="/forgot-password" className="font-semibold text-emerald-600 hover:underline">
            Omba kiungo kipya / Request new link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="alert-error">{error}</div>}
          <div>
            <label className="label-field">New Password</label>
            <PasswordInput
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Confirm Password</label>
            <PasswordInput
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Inahifadhi / Saving...' : 'Hifadhi nenosiri / Save password'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
