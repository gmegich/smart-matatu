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
    <div className="flex min-h-screen items-center justify-center page-bg p-4">
      <div className="card w-full max-w-xl animate-fade-up p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-2xl">
            ⚙️
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Database setup required</h2>
            <p className="text-sm text-slate-500">One-time configuration</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          {message ||
            'Your login works, but Supabase tables are missing. Run the SQL setup once (takes ~1 minute).'}
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-800">Database status</p>
          {checking ? (
            <p className="mt-2 text-slate-400">Checking...</p>
          ) : dbStatus?.ready ? (
            <p className="mt-2 font-medium text-emerald-600">
              All tables found. Click &quot;Check again&quot; below.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {dbStatus?.tables &&
                Object.entries(dbStatus.tables).map(([name, info]) => (
                  <li key={name} className={info.ok ? 'text-emerald-600' : 'text-red-600'}>
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

        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            Open{' '}
            <a
              href={SQL_EDITOR_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-600 hover:underline"
            >
              Supabase SQL Editor
            </a>
          </li>
          <li>
            Open file{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
              supabase/setup-all.sql
            </code>{' '}
            in this project, copy <strong>all</strong> of it
          </li>
          <li>
            Paste into SQL Editor → click <strong>Run</strong>
          </li>
          <li>Wait for &quot;Success&quot; (ignore realtime warnings if any)</li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={handleRetry} disabled={retrying || checking} className="btn-primary text-sm">
            {retrying ? 'Checking...' : 'I ran the SQL — Check again'}
          </button>
          <button onClick={signOut} className="btn-secondary text-sm">
            Log out
          </button>
          <Link to="/login" className="btn-secondary text-sm">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
