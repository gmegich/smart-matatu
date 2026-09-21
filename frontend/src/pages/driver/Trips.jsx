import { useEffect, useState, useRef } from 'react'
import Layout from '../../components/Layout'
import { supabase, formatCurrency } from '../../lib/supabase'
import { fetchDriverCollections, setTripFull, fetchTripPassengers, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function DriverTrips() {
  const { profile } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [activeTrip, setActiveTrip] = useState(null)
  const [collections, setCollections] = useState(null)
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [routeStages, setRouteStages] = useState([])
  const [direction, setDirection] = useState('forward')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [togglingFull, setTogglingFull] = useState(false)
  const [tripPassengers, setTripPassengers] = useState([])
  const gpsInterval = useRef(null)

  const loadCollections = () => {
    fetchDriverCollections().then(setCollections).catch(() => {})
  }

  const loadPassengers = () => {
    fetchTripPassengers().then((d) => setTripPassengers(d.passengers || [])).catch(() => {})
  }

  useEffect(() => {
    const load = async () => {
      const { data: assign } = await supabase
        .from('driver_assignments')
        .select('*, vehicles(*)')
        .eq('driver_id', profile.id)
        .eq('is_active', true)
        .maybeSingle()
      setAssignment(assign)
      if (assign?.route_id) setSelectedRoute(assign.route_id)

      const { data: trip } = await supabase
        .from('trips')
        .select('*, vehicles(plate_number, capacity)')
        .eq('driver_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()
      setActiveTrip(trip)

      const { data: r } = await supabase.from('routes').select('*').eq('is_active', true)
      setRoutes(r || [])
      loadCollections()
      loadPassengers()
    }
    if (profile?.id) load()
  }, [profile])

  useEffect(() => {
    if (!selectedRoute) {
      setRouteStages([])
      return
    }
    supabase
      .from('route_stages')
      .select('id, name, order_index')
      .eq('route_id', selectedRoute)
      .order('order_index')
      .then(({ data }) => setRouteStages(data || []))
  }, [selectedRoute])

  const startGpsTracking = (tripId, vehicleId) => {
    if (gpsInterval.current) clearInterval(gpsInterval.current)

    const sendLocation = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await supabase.rpc('upsert_vehicle_location', {
          p_vehicle_id: vehicleId,
          p_trip_id: tripId,
          p_latitude: pos.coords.latitude,
          p_longitude: pos.coords.longitude,
        })
      })
    }

    sendLocation()
    gpsInterval.current = setInterval(sendLocation, 10000)
  }

  const stopGpsTracking = () => {
    if (gpsInterval.current) {
      clearInterval(gpsInterval.current)
      gpsInterval.current = null
    }
  }

  useEffect(() => {
    if (activeTrip && assignment?.vehicle_id) {
      startGpsTracking(activeTrip.id, assignment.vehicle_id)
    }
    return () => stopGpsTracking()
  }, [activeTrip, assignment])

  const handleStartTrip = async () => {
    if (!assignment?.vehicle_id || !selectedRoute) {
      setMessage('No vehicle assigned or route selected')
      return
    }
    setError('')
    setMessage('')
    const { data, error: rpcError } = await supabase.rpc('start_trip', {
      p_vehicle_id: assignment.vehicle_id,
      p_route_id: selectedRoute,
      p_direction: direction,
    })
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message)
      return
    }
    const { data: trip } = await supabase
      .from('trips')
      .select('*, vehicles(plate_number, capacity)')
      .eq('id', data.trip_id)
      .single()
    setActiveTrip(trip)
    setMessage('Safari imeanza! GPS tracking active.')
    loadCollections()
    loadPassengers()
  }

  const handleEndTrip = async () => {
    if (!activeTrip) return
    stopGpsTracking()
    setError('')
    const { data, error: rpcError } = await supabase.rpc('end_trip', { p_trip_id: activeTrip.id })
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message)
      return
    }
    setActiveTrip(null)
    setMessage('Safari imekamilika.')
    loadCollections()
  }

  const handleToggleFull = async (isFull) => {
    setTogglingFull(true)
    setError('')
    try {
      const trip = await setTripFull(isFull)
      setActiveTrip(trip)
      setMessage(
        isFull
          ? 'Gari limejaa! Abiria wamearifiwa — Car is full, passengers notified.'
          : 'Gari lina nafasi tena — Seats available again.'
      )
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setTogglingFull(false)
    }
  }

  const capacity = activeTrip?.vehicles?.capacity || assignment?.vehicles?.capacity || 14
  const boarded = collections?.trip_verified_count || 0

  return (
    <Layout title="Safari / Trips">
      <div className="mx-auto max-w-xl space-y-6">
        {message && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{message}</div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {activeTrip && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-2 font-semibold">Mapato ya Safari / Trip Collections</h3>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(collections?.trip_verified_total)}
            </p>
            <p className="text-sm text-gray-600">
              {boarded} verified · {collections?.trip_pending_count || 0} pending payment
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Vititi: {boarded} / {capacity}
            </p>
            {tripPassengers.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-800">Abiria / Passengers</h4>
                <ul className="space-y-2">
                  {tripPassengers.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        {p.passenger?.full_name} · {p.payment_code}{' '}
                        <span className="text-gray-500">({p.status})</span>
                      </span>
                      {p.passenger?.phone ? (
                        <a href={`tel:${p.passenger.phone}`} className="font-medium text-green-700">
                          {p.passenger.phone}
                        </a>
                      ) : (
                        <span className="text-amber-600">No phone</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Gari & Njia / Vehicle & Route</h3>
          <p className="text-sm text-gray-600">
            Vehicle: <strong>{assignment?.vehicles?.plate_number || 'Not assigned'}</strong>
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">Njia / Route</label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              disabled={!!activeTrip}
              className="w-full rounded-lg border px-4 py-2.5"
            >
              <option value="">Chagua njia / Select route...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {routeStages.length >= 2 && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Mwelekeo / Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                disabled={!!activeTrip}
                className="w-full rounded-lg border px-4 py-2.5"
              >
                <option value="forward">
                  Kuelekea {routeStages[routeStages.length - 1].name} / Towards {routeStages[routeStages.length - 1].name}
                </option>
                <option value="return">
                  Kuelekea {routeStages[0].name} / Towards {routeStages[0].name} (kurudi / return)
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {direction === 'forward'
                  ? `${routeStages[0].name} → ${routeStages[routeStages.length - 1].name}`
                  : `${routeStages[routeStages.length - 1].name} → ${routeStages[0].name}`}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          {!activeTrip ? (
            <button
              onClick={handleStartTrip}
              className="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white hover:bg-green-700"
            >
              Anza Safari / Start Trip
            </button>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 text-center ${
                  activeTrip.is_full ? 'bg-red-50' : 'bg-green-50'
                }`}
              >
                <p className={`text-sm ${activeTrip.is_full ? 'text-red-600' : 'text-green-600'}`}>
                  {activeTrip.is_full
                    ? 'GARI LIMEJAA — Passengers see this on their app'
                    : 'Safari inaendelea — GPS kila sekunde 10'}
                </p>
                <p className="font-semibold text-gray-800">
                  Started {new Date(activeTrip.started_at).toLocaleTimeString()}
                </p>
                {activeTrip.direction && (
                  <p className="mt-1 text-xs font-medium text-gray-600">
                    Mwelekeo / Direction: {activeTrip.direction === 'return' ? 'Kurudi / Return' : 'Kwenda / Forward'}
                  </p>
                )}
              </div>

              {!activeTrip.is_full ? (
                <button
                  onClick={() => handleToggleFull(true)}
                  disabled={togglingFull}
                  className="w-full rounded-lg bg-red-600 py-4 text-lg font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {togglingFull ? '...' : 'Gari Limejaa / Car is FULL'}
                </button>
              ) : (
                <button
                  onClick={() => handleToggleFull(false)}
                  disabled={togglingFull}
                  className="w-full rounded-lg bg-amber-500 py-4 text-lg font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {togglingFull ? '...' : 'Kuna Nafasi / Seats Available'}
                </button>
              )}

              <button
                onClick={handleEndTrip}
                className="w-full rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Maliza Safari / End Trip
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
