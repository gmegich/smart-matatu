import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function DriverRoutes() {
  const { profile } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [stages, setStages] = useState([])
  const [fares, setFares] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data: assign } = await supabase
        .from('driver_assignments')
        .select('*, routes(*), vehicles(plate_number)')
        .eq('driver_id', profile.id)
        .eq('is_active', true)
        .maybeSingle()
      setAssignment(assign)

      if (assign?.route_id) {
        const [{ data: s }, { data: f }] = await Promise.all([
          supabase.from('route_stages').select('*').eq('route_id', assign.route_id).order('order_index'),
          supabase
            .from('stage_fares')
            .select('*, from_stage:from_stage_id(name), to_stage:to_stage_id(name)')
            .eq('route_id', assign.route_id),
        ])
        setStages(s || [])
        setFares(f || [])
      }
    }
    if (profile?.id) load()
  }, [profile])

  return (
    <Layout title="Njia Zangu / My Routes">
      {assignment ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold">{assignment.routes?.name}</h3>
          <p className="text-sm text-gray-500">Vehicle: {assignment.vehicles?.plate_number}</p>

          <h4 className="mb-3 mt-6 font-semibold">Vituo / Stages</h4>
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

          <h4 className="mb-3 font-semibold">Nauli / Fares</h4>
          <div className="space-y-2">
            {fares.map((f) => (
              <div key={f.id} className="flex justify-between rounded-lg bg-gray-50 px-4 py-2">
                <span>
                  {f.from_stage?.name} → {f.to_stage?.name}
                </span>
                <span className="font-semibold text-green-700">KES {f.fare_amount}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Hujapewa njia bado. Wasiliana na msimamizi.</p>
      )}
    </Layout>
  )
}
