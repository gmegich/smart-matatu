import { useEffect, useState, useCallback } from 'react'
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

  const load = useCallback(async () => {
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
        .select('*, vehicles(plate_number)')
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
      .select('*, vehicles(plate_number)')
      .in('vehicle_id', ids)

    setLocations((data || []).map(normalizeLocation).filter(Boolean))
    setLoading(false)
    setLastSync(new Date())
  }, [vehicleIds, vehicleId, saccoId, activeTripsOnly])

  useEffect(() => {
    setLoading(true)
    load()

    const channelName = `live-${vehicleId || saccoId || vehicleIds?.join('-') || 'all'}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_locations' },
        () => {
          load()
        }
      )
      .subscribe()

    const poll = setInterval(load, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [load])

  return { locations, loading, lastSync, refresh: load }
}
