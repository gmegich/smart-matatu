import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import { supabase, formatCurrency } from '../../lib/supabase'
import { fetchDriverCollections } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function DriverDashboard() {
  const { profile } = useAuth()
  const [collections, setCollections] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [assignment, setAssignment] = useState(null)

  useEffect(() => {
    if (!profile?.id) return

    const refreshCollections = () => {
      fetchDriverCollections().then(setCollections).catch(() => {})
    }

    const refreshTripAndAssignment = async () => {
      const [tripRes, assignRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*, routes(name), vehicles(plate_number)')
          .eq('driver_id', profile.id)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('driver_assignments')
          .select('*, vehicles(plate_number), routes(name)')
          .eq('driver_id', profile.id)
          .eq('is_active', true)
          .maybeSingle(),
      ])
      setActiveTrip(tripRes.data)
      setAssignment(assignRes.data)
    }

    const load = async () => {
      refreshCollections()
      await refreshTripAndAssignment()
    }

    load()

    const channel = supabase
      .channel('driver-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refreshCollections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        refreshCollections()
        refreshTripAndAssignment()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.id])

  return (
    <Layout title={`Dereva / Driver — ${profile?.full_name}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Imekusanywa Leo / Collected Today"
          value={formatCurrency(collections?.today_total)}
          subtitle={`${collections?.today_count || 0} verified payments`}
          icon="💰"
          color="green"
        />
        <StatCard
          title="Safari Hii / This Trip"
          value={formatCurrency(collections?.trip_verified_total)}
          subtitle={`${collections?.trip_verified_count || 0} verified`}
          icon="🚌"
          color="blue"
        />
        <StatCard
          title="Safari Hai / Active Trip"
          value={activeTrip ? (activeTrip.is_full ? 'IMEJAA' : 'Active') : 'None'}
          subtitle={activeTrip?.routes?.name}
          icon="🚐"
          color={activeTrip?.is_full ? 'red' : activeTrip ? 'green' : 'yellow'}
        />
        <StatCard
          title="Gari Langu / My Vehicle"
          value={assignment?.vehicles?.plate_number || '—'}
          subtitle={assignment?.routes?.name}
          icon="✅"
          color="red"
        />
      </div>

      {activeTrip && (
        <div
          className={`mt-6 rounded-xl border p-6 ${
            activeTrip.is_full ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'
          }`}
        >
          <h3 className={`font-semibold ${activeTrip.is_full ? 'text-red-800' : 'text-green-800'}`}>
            {activeTrip.is_full ? 'Gari Limejaa — Passengers notified' : 'Safari Inaendelea / Trip in Progress'}
          </h3>
          <p className={`text-sm ${activeTrip.is_full ? 'text-red-700' : 'text-green-700'}`}>
            {activeTrip.vehicles?.plate_number} — {activeTrip.routes?.name}
          </p>
          <p className="text-xs text-gray-600">
            Started: {new Date(activeTrip.started_at).toLocaleString()}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to="/driver/trips"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Dhibiti Safari / Manage Trip
            </Link>
            <Link
              to="/driver/track"
              className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
            >
              Ramani Hai / Live Map
            </Link>
          </div>
        </div>
      )}
    </Layout>
  )
}
