import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'

function normalizeLocation(row) {
  if (!row) return null
  return {
    vehicle_id: row.vehicle_id,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    updated_at: row.updated_at || row.recorded_at,
    label: row.vehicles?.plate_number || 'Matatu',
    route_name: row.vehicles?.route_name,
    driver_name: row.vehicles?.driver_name,
  }
}

/**
 * Live vehicle locations via Supabase Realtime + polling fallback.
 * @param {{ vehicleIds?: string[], vehicleId?: string, saccoId?: string, activeTripsOnly?: boolean }} options
 */
export function useLiveVehicleLocations({
  vehicleIds = null,
  vehicleId = null,
  saccoId = null,
  activeTripsOnly = false,
} = {}) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const realtimeOk = useRef(false)
  const loadInFlight = useRef(false)

  const idsKey = useMemo(
    () => (vehicleIds?.length ? [...vehicleIds].sort().join(',') : ''),
    [vehicleIds]
  )

  const load = useCallback(async () => {
    if (loadInFlight.current) return
    loadInFlight.current = true

    try {
      let ids = vehicleIds

      if (vehicleId) {
        ids = [vehicleId]
      } else if (saccoId && activeTripsOnly) {
        const { data: trips } = await supabase
          .from('trips')
          .select('vehicle_id, routes(name), profiles:driver_id(full_name)')
          .eq('sacco_id', saccoId)
          .eq('status', 'active')

        const tripMap = {}
        ;(trips || []).forEach((t) => {
          if (t.vehicle_id) {
            tripMap[t.vehicle_id] = {
              route_name: t.routes?.name,
              driver_name: t.profiles?.full_name,
            }
          }
        })
        ids = Object.keys(tripMap)
        if (!ids.length) {
          setLocations([])
          setLoading(false)
          setLastSync(new Date())
          return
        }

        const { data } = await supabase
          .from('vehicle_locations')
          .select('vehicle_id, latitude, longitude, updated_at, vehicles(plate_number)')
          .in('vehicle_id', ids)

        setLocations(
          (data || []).map((row) => {
            const base = normalizeLocation(row)
            const extra = tripMap[row.vehicle_id] || {}
            return { ...base, route_name: extra.route_name, driver_name: extra.driver_name }
          })
        )
        setLoading(false)
        setLastSync(new Date())
        return
      }

      if (!ids?.length) {
        setLocations([])
        setLoading(false)
        setLastSync(new Date())
        return
      }

      const { data } = await supabase
        .from('vehicle_locations')
        .select('vehicle_id, latitude, longitude, updated_at, vehicles(plate_number)')
        .in('vehicle_id', ids)

      setLocations((data || []).map(normalizeLocation).filter(Boolean))
      setLoading(false)
      setLastSync(new Date())
    } finally {
      loadInFlight.current = false
    }
  }, [vehicleIds, vehicleId, saccoId, activeTripsOnly])

  useEffect(() => {
    setLoading(true)
    realtimeOk.current = false
    load()

    const channelName = `live-${vehicleId || saccoId || idsKey || 'all'}`
    const filter = vehicleId
      ? `vehicle_id=eq.${vehicleId}`
      : undefined

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_locations',
          ...(filter ? { filter } : {}),
        },
        () => {
          load()
        }
      )
      .subscribe((status) => {
        realtimeOk.current = status === 'SUBSCRIBED'
      })

    // Poll only as fallback when Realtime isn't connected (every 15s instead of 10s)
    const poll = setInterval(() => {
      if (!realtimeOk.current) load()
    }, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load, vehicleId, saccoId, idsKey])

  return { locations, loading, lastSync, refresh: load }
}
