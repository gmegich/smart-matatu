import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase, formatDate } from '../../lib/supabase'
import { adminEndTrip, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminTrips() {
  const { profile } = useAuth()
  const [trips, setTrips] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(null)

  const load = async () => {
    const { data } = await supabase
      .from('trips')
      .select('*, routes(name), vehicles(plate_number), profiles:driver_id(full_name)')
      .eq('sacco_id', profile.sacco_id)
      .order('started_at', { ascending: false })
      .limit(50)
    setTrips(data || [])
  }

  useEffect(() => {
    if (profile?.sacco_id) load()

    const channel = supabase
      .channel('admin-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, load)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  const handleEndTrip = async (tripId) => {
    if (!window.confirm('Force-end this trip?')) return
    setEnding(tripId)
    setError('')
    try {
      await adminEndTrip(tripId)
      setMessage('Trip ended')
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setEnding(null)
    }
  }

  return (
    <Layout title="Safari / Trips Monitor">
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4">Route</th>
              <th className="p-4">Vehicle</th>
              <th className="p-4">Driver</th>
              <th className="p-4">Status</th>
              <th className="p-4">Started</th>
              <th className="p-4">Ended</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {trips.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="p-4">{t.routes?.name}</td>
                <td className="p-4">{t.vehicles?.plate_number}</td>
                <td className="p-4">{t.profiles?.full_name}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-4">{formatDate(t.started_at)}</td>
                <td className="p-4">{t.ended_at ? formatDate(t.ended_at) : '—'}</td>
                <td className="p-4">
                  {t.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleEndTrip(t.id)}
                      disabled={ending === t.id}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {ending === t.id ? 'Ending...' : 'End Trip'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
