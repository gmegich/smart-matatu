import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const SQL_EDITOR_URL =
  'https://supabase.com/dashboard/project/wbvzyxkacxthxmcdmtoe/sql/new'

export default function SetupRequired({ message }) {
  const { refreshProfile, signOut, repairUserProfile } = useAuth()
  const [dbStatus, setDbStatus] = useState(null)
  const [checking, setChecking] = useState(true)
  const [retrying, setRetrying] = useState(false)

  const checkDb = async () => {
    setChecking(true)
    try {
      const { data } = await api.get('/health/db')
      setDbStatus(data)
      return data
    } catch (err) {
      const data = err.response?.data
      const status = data || { ready: false, error: 'Backend not reachable. Run: cd backend && npm run dev' }
      setDbStatus(status)
      return status
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkDb()
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const status = await checkDb()
      if (status?.ready) {
        await repairUserProfile()
        await refreshProfile()
      }
    } catch (err) {
      setDbStatus((prev) => ({
        ...prev,
        profileError: err.response?.data?.error || 'Could not create profile. Log out and log in again.',
      }))
    }
    setRetrying(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-xl rounded-xl border bg-white p-8 shadow-lg">
        <h2 className="text-xl font-bold text-gray-900">Database setup required</h2>
        <p className="mt-3 text-sm text-gray-600">
          {message ||
            'Your login works, but Supabase tables are missing. Run the SQL setup once (takes ~1 minute).'}
        </p>

        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
          <p className="font-semibold text-gray-800">Database status</p>
          {checking ? (
            <p className="mt-2 text-gray-500">Checking...</p>
          ) : dbStatus?.ready ? (
            <p className="mt-2 text-green-700">All tables found. Click &quot;Check again&quot; below.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {dbStatus?.tables &&
                Object.entries(dbStatus.tables).map(([name, info]) => (
                  <li key={name} className={info.ok ? 'text-green-700' : 'text-red-600'}>
                    {info.ok ? '✓' : '✗'} {name}
                    {!info.ok && info.error && (
                      <span className="block text-xs text-red-500">{info.error}</span>
                    )}
                  </li>
                ))}
              {dbStatus?.error && <li className="text-red-600">{dbStatus.error}</li>}
              {dbStatus?.profileError && <li className="text-red-600">{dbStatus.profileError}</li>}
            </ul>
          )}
        </div>

        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-gray-700">
          <li>
            Open{' '}
            <a
              href={SQL_EDITOR_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-green-600 hover:underline"
            >
              Supabase SQL Editor
            </a>
          </li>
          <li>
            Open file <code className="rounded bg-gray-100 px-1">supabase/setup-all.sql</code> in this
            project, copy <strong>all</strong> of it
          </li>
          <li>Paste into SQL Editor → click <strong>Run</strong></li>
          <li>Wait for &quot;Success&quot; (ignore realtime warnings if any)</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleRetry}
            disabled={retrying || checking}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {retrying ? 'Checking...' : 'I ran the SQL — Check again'}
          </button>
          <button
            onClick={signOut}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
          <Link to="/login" className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
