import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase, formatCurrency } from '../../lib/supabase'

export default function PassengerRoutes() {
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [stages, setStages] = useState([])
  const [fares, setFares] = useState([])

  useEffect(() => {
    supabase
      .from('routes')
      .select('*, saccos(name)')
      .eq('is_active', true)
      .then(({ data }) => setRoutes(data || []))
  }, [])

  const loadRouteDetails = async (routeId) => {
    setSelectedRoute(routeId)
    const [{ data: s }, { data: f }] = await Promise.all([
      supabase.from('route_stages').select('*').eq('route_id', routeId).order('order_index'),
      supabase
        .from('stage_fares')
        .select('*, from_stage:from_stage_id(name), to_stage:to_stage_id(name)')
        .eq('route_id', routeId),
    ])
    setStages(s || [])
    setFares(f || [])
  }

  return (
    <Layout title="Njia & Nauli / Routes & Fares">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Chagua Njia / Select Route</h3>
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={() => loadRouteDetails(r.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedRoute === r.id
                  ? 'border-green-500 bg-green-50'
                  : 'bg-white hover:border-green-300'
              }`}
            >
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm text-gray-500">{r.saccos?.name}</p>
              <p className="text-xs text-gray-400">{r.description}</p>
            </button>
          ))}
        </div>

        {selectedRoute && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">Vituo / Stages</h3>
            <ol className="mb-6 space-y-2">
              {stages.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                    {i + 1}
                  </span>
                  {s.name}
                </li>
              ))}
            </ol>

            <h3 className="mb-3 font-semibold">Nauli / Fares</h3>
            <div className="space-y-2">
              {fares.map((f) => (
                <div
                  key={f.id}
                  className="flex justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm"
                >
                  <span>
                    {f.from_stage?.name} → {f.to_stage?.name}
                  </span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(f.fare_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
