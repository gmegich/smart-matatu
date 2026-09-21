import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MapView, { LiveMapBadge } from '../../components/MapView'
import { useLiveVehicleLocations } from '../../hooks/useLiveVehicleLocations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AdminLiveMap() {
  const { profile } = useAuth()
  const { locations, loading, lastSync } = useLiveVehicleLocations({
    saccoId: profile?.sacco_id,
    activeTripsOnly: true,
  })

  const [activeTrips, setActiveTrips] = useState([])

  useEffect(() => {
    if (!profile?.sacco_id) return

    const load = async () => {
      const { data } = await supabase
        .from('trips')
        .select('*, routes(name), vehicles(plate_number), profiles:driver_id(full_name)')
        .eq('sacco_id', profile.sacco_id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
      setActiveTrips(data || [])
    }

    load()

    const channel = supabase
      .channel('admin-live-trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, load)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  return (
    <Layout title="Ramani Hai / Live Fleet Map">
      <p className="mb-4 text-sm text-gray-600">
        Fuatilia matatu zote zenye safari hai katika SACCO yako / Track all active matatus in your SACCO — eneo linasasishwa moja kwa moja / live updates.
      </p>

      <LiveMapBadge lastSync={lastSync} count={locations.length} />

      {loading && locations.length === 0 ? (
        <p className="mb-4 text-gray-500">Inapakia ramani / Loading map...</p>
      ) : (
        <MapView vehicles={locations} autoFit zoom={12} />
      )}

      {activeTrips.length === 0 && !loading && (
        <p className="mt-4 text-sm text-gray-500">Hakuna safari hai sasa / No active trips — ramani itaonyesha matatu zinapoanza safari.</p>
      )}

      {activeTrips.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white shadow-sm overflow-x-auto">
          <h3 className="border-b p-4 font-semibold">Safari Hai / Active Trips</h3>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4">Matatu</th>
                <th className="p-4">Dereva / Driver</th>
                <th className="p-4">Njia / Route</th>
                <th className="p-4">GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeTrips.map((t) => {
                const hasGps = locations.some((l) => l.vehicle_id === t.vehicle_id)
                return (
                  <tr key={t.id}>
                    <td className="p-4 font-medium">{t.vehicles?.plate_number}</td>
                    <td className="p-4">{t.profiles?.full_name}</td>
                    <td className="p-4">{t.routes?.name}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          hasGps ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {hasGps ? 'Live' : 'Waiting'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
