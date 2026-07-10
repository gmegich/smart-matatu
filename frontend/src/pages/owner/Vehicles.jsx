import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { formatCurrency } from '../../lib/supabase'
import { fetchOwnerDashboard } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function OwnerVehicles() {
  const { profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOwnerDashboard()
      .then((data) => setVehicles(data?.vehicles || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false))
  }, [profile])

  return (
    <Layout title="Magari Yangu / My Vehicles">
      {loading ? (
        <p className="text-gray-500">Inapakia...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="mb-2 text-3xl">🚌</div>
              <h3 className="text-lg font-bold">{v.plate_number}</h3>
              <p className="text-sm text-gray-500">{v.saccos?.name}</p>
              <p className="mt-2 text-sm">Capacity: {v.capacity} seats</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-green-50 p-2">
                  <p className="text-gray-500">Mapato</p>
                  <p className="font-semibold text-green-800">{formatCurrency(v.earnings)}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <p className="text-gray-500">Safari</p>
                  <p className="font-semibold text-blue-800">{v.tripCount}</p>
                </div>
              </div>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs capitalize ${
                  v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {v.status}
              </span>
              {v.activeTrip && (
                <p className="mt-2 text-xs text-amber-700">On trip now — {v.activeTrip.routes?.name}</p>
              )}
              <Link
                to="/owner/track"
                className="mt-3 inline-block text-sm font-semibold text-green-700 hover:underline"
              >
                Fuatilia / Track
              </Link>
            </div>
          ))}
          {vehicles.length === 0 && (
            <p className="text-gray-500">Huna magari yaliyosajiliwa bado.</p>
          )}
        </div>
      )}
    </Layout>
  )
}
