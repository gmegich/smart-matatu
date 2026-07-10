import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../../components/PasswordInput'
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 via-green-800 to-red-800 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Weka Nenosiri Jipya</h1>
          <p className="text-sm text-gray-500">Set a new password</p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-gray-500">Inathibitisha kiungo... / Verifying link...</p>
        ) : !ready ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
            <Link to="/forgot-password" className="font-semibold text-green-600 hover:underline">
              Omba kiungo kipya / Request new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
              <PasswordInput
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Inahifadhi...' : 'Hifadhi nenosiri / Save password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
