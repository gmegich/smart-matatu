import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const matatuIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const matatuIcons = [
  matatuIcon,
  new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
  new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }),
]

function Recenter({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom())
  }, [center, zoom, map])
  return null
}

export default function MapView({
  center = [-0.3031, 36.08],
  zoom = 13,
  vehicleLocation = null,
  vehicleLabel = 'Matatu',
  vehicles = [],
  stages = [],
  heightClass = 'h-80 lg:h-[28rem]',
  autoFit = false,
}) {
  const markers = useMemo(() => {
    if (vehicles.length > 0) return vehicles
    if (vehicleLocation) {
      return [
        {
          vehicle_id: 'single',
          lat: vehicleLocation.lat,
          lng: vehicleLocation.lng,
          updated_at: vehicleLocation.updated_at,
          label: vehicleLabel,
        },
      ]
    }
    return []
  }, [vehicles, vehicleLocation, vehicleLabel])

  const mapCenter = useMemo(() => {
    if (markers.length === 1) return [markers[0].lat, markers[0].lng]
    if (markers.length > 1) {
      const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length
      const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length
      return [avgLat, avgLng]
    }
    return center
  }, [markers, center])

  const stagePositions = stages
    .filter((s) => s.latitude && s.longitude)
    .map((s) => [Number(s.latitude), Number(s.longitude)])

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border shadow-sm ${heightClass}`}>
      <MapContainer center={mapCenter} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {autoFit && markers.length > 0 && (
          <Recenter center={mapCenter} zoom={markers.length > 1 ? 12 : 14} />
        )}
        {!autoFit && markers.length === 1 && (
          <Recenter center={[markers[0].lat, markers[0].lng]} />
        )}
        {markers.map((m, i) => (
          <Marker
            key={m.vehicle_id || i}
            position={[m.lat, m.lng]}
            icon={matatuIcons[i % matatuIcons.length]}
          >
            <Popup>
              <strong>🚌 {m.label}</strong>
              {m.route_name && (
                <>
                  <br />
                  Route: {m.route_name}
                </>
              )}
              {m.driver_name && (
                <>
                  <br />
                  Driver: {m.driver_name}
                </>
              )}
              <br />
              <span className="text-xs text-gray-600">
                Updated: {m.updated_at ? new Date(m.updated_at).toLocaleTimeString() : '—'}
              </span>
            </Popup>
          </Marker>
        ))}
        {stagePositions.length > 1 && (
          <Polyline positions={stagePositions} color="#16a34a" weight={4} opacity={0.7} />
        )}
        {stages.map(
          (s) =>
            s.latitude &&
            s.longitude && (
              <Marker key={s.id} position={[Number(s.latitude), Number(s.longitude)]}>
                <Popup>{s.name}</Popup>
              </Marker>
            )
        )}
      </MapContainer>
    </div>
  )
}

export function LiveMapBadge({ lastSync, count = 0 }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
        </span>
        Live map
      </span>
      {count > 0 && (
        <span className="text-gray-600">
          {count} matatu{count !== 1 ? 's' : ''} on map
        </span>
      )}
      {lastSync && (
        <span className="text-xs text-gray-400">
          Last sync: {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
