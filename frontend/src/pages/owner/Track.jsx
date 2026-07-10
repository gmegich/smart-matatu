import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import MapView, { LiveMapBadge } from '../../components/MapView'
import { useLiveVehicleLocations } from '../../hooks/useLiveVehicleLocations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function OwnerTrack() {
  const { profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', profile.id)
      .then(({ data }) => setVehicles(data || []))
  }, [profile])

  const { locations, loading, lastSync } = useLiveVehicleLocations({
    vehicleId: selectedVehicle,
  })

  const selected = vehicles.find((v) => v.id === selectedVehicle)

  return (
    <Layout title="Fuatilia Gari / Track Vehicle">
      <div className="mb-4 flex flex-wrap gap-2">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicle(v.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              selectedVehicle === v.id ? 'border-green-500 bg-green-50' : 'bg-white'
            }`}
          >
            {v.plate_number}
          </button>
        ))}
      </div>

      {selectedVehicle ? (
        <>
          <LiveMapBadge lastSync={lastSync} count={locations.length} />
          {loading && !locations.length ? (
            <p className="text-gray-500">Inapakia ramani...</p>
          ) : (
            <MapView
              vehicles={locations.map((l) => ({ ...l, label: selected?.plate_number || l.label }))}
              autoFit
            />
          )}
          {!locations.length && !loading && (
            <p className="mt-3 text-sm text-gray-500">Hakuna GPS bado — dereva lazima aanze safari.</p>
          )}
        </>
      ) : (
        <p className="text-gray-500">Chagua gari kufuatilia</p>
      )}
    </Layout>
  )
}
