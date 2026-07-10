import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import { formatCurrency } from '../../lib/supabase'
import { fetchOwnerDashboard } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function OwnerDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOwnerDashboard()
      .then(setStats)
      .catch(() => setStats({ totalEarnings: 0, totalTrips: 0, activeTrips: 0, vehicles: [] }))
      .finally(() => setLoading(false))
  }, [profile])

  const vehicles = stats?.vehicles || []

  return (
    <Layout title={`Mmiliki / Owner — ${profile?.full_name}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Magari Yangu" value={vehicles.length} icon="🚌" color="green" />
        <StatCard title="Jumla Mapato" value={formatCurrency(stats?.totalEarnings || 0)} icon="💰" color="blue" />
        <StatCard title="Safari Zote" value={stats?.totalTrips || 0} icon="📍" color="red" />
        <StatCard title="Safari Hai" value={stats?.activeTrips || 0} icon="🟢" color="yellow" />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Magari Yangu / My Vehicles</h3>
          <Link to="/owner/track" className="text-sm font-semibold text-green-700 hover:underline">
            Fuatilia moja kwa moja / Live track →
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500">Inapakia...</p>
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
            <p>Huna magari yaliyosajiliwa bado.</p>
            <p className="mt-1 text-sm">Admin lazima akusajili kama mmiliki na akugawie gari.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((v) => (
              <div key={v.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{v.plate_number}</h4>
                    <p className="text-sm text-gray-500">{v.saccos?.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs capitalize ${
                      v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-gray-500">Mapato</p>
                    <p className="font-bold text-green-800">{formatCurrency(v.earnings)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-gray-500">Safari</p>
                    <p className="font-bold text-blue-800">{v.tripCount}</p>
                  </div>
                </div>

                {v.activeTrip ? (
                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-amber-900">Safari hai / Active trip</p>
                    <p className="text-amber-800">
                      {v.activeTrip.routes?.name || 'Route'} — {v.activeTrip.profiles?.full_name || 'Driver'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">Hakuna safari hai sasa</p>
                )}

                {v.location ? (
                  <p className="mt-2 text-xs text-gray-500">
                    GPS: {Number(v.location.latitude).toFixed(5)}, {Number(v.location.longitude).toFixed(5)}
                    {' · '}
                    {new Date(v.location.updated_at).toLocaleString('en-KE')}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">Hakuna GPS — dereva lazima aanze safari</p>
                )}

                <Link
                  to="/owner/track"
                  className="mt-4 inline-block text-sm font-semibold text-green-700 hover:underline"
                >
                  Fuatilia gari hili / Track this vehicle
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
