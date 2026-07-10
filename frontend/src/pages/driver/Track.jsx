import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MapView, { LiveMapBadge } from '../../components/MapView'
import { useLiveVehicleLocations } from '../../hooks/useLiveVehicleLocations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function DriverTrack() {
  const { profile } = useAuth()
  const [vehicleId, setVehicleId] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [stages, setStages] = useState([])

  useEffect(() => {
    if (!profile?.id) return

    const load = async () => {
      const { data: trip } = await supabase
        .from('trips')
        .select('*, routes(name), vehicles(plate_number)')
        .eq('driver_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      setActiveTrip(trip)

      if (trip?.vehicle_id) {
        setVehicleId(trip.vehicle_id)
        if (trip.route_id) {
          const { data: s } = await supabase
            .from('route_stages')
            .select('*')
            .eq('route_id', trip.route_id)
            .order('order_index')
          setStages(s || [])
        }
        return
      }

      const { data: assign } = await supabase
        .from('driver_assignments')
        .select('vehicle_id')
        .eq('driver_id', profile.id)
        .eq('is_active', true)
        .maybeSingle()

      setVehicleId(assign?.vehicle_id || null)
    }

    load()
  }, [profile])

  const { locations, loading, lastSync } = useLiveVehicleLocations({ vehicleId })

  const location = locations[0]

  return (
    <Layout title="Ramani Hai / Live Map">
      <p className="mb-4 text-sm text-gray-600">
        Angalia mahali pa gari lako kwa wakati halisi wakati safari inaendelea.
      </p>

      {activeTrip ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <strong>Safari hai:</strong> {activeTrip.vehicles?.plate_number} — {activeTrip.routes?.name}
          <br />
          <span className="text-xs">GPS inatumwa kila sekunde 10 kutoka ukurasa wa Safari</span>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Hakuna safari hai. Anza safari kwenye <strong>Safari / Trips</strong> ili kusasisha eneo kwenye ramani.
        </div>
      )}

      <LiveMapBadge lastSync={lastSync} count={location ? 1 : 0} />

      {loading && !location ? (
        <p className="text-gray-500">Inapakia ramani...</p>
      ) : location ? (
        <MapView vehicles={locations} stages={stages} autoFit />
      ) : (
        <MapView stages={stages} />
      )}

      {!location && vehicleId && !loading && (
        <p className="mt-3 text-sm text-gray-500">
          Hakuna data ya GPS bado. Anza safari na ruhusu eneo la kivinjari.
        </p>
      )}
    </Layout>
  )
}
