import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import AdminEditModal from '../../components/AdminEditModal'
import { supabase, formatCurrency } from '../../lib/supabase'
import {
  deactivateRoute,
  deleteRouteFare,
  deleteRouteStage,
  getApiErrorMessage,
  updateRoute,
  updateRouteFare,
  updateRouteStage,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoutes() {
  const { profile } = useAuth()
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [stages, setStages] = useState([])
  const [fares, setFares] = useState([])
  const [routeForm, setRouteForm] = useState({ name: '', description: '' })
  const [stageForm, setStageForm] = useState({ name: '', order_index: 1, latitude: '', longitude: '' })
  const [fareForm, setFareForm] = useState({ from_stage_id: '', to_stage_id: '', fare_amount: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editRoute, setEditRoute] = useState(null)
  const [editStage, setEditStage] = useState(null)
  const [editFare, setEditFare] = useState(null)
  const [routeEditForm, setRouteEditForm] = useState({ name: '', description: '' })
  const [stageEditForm, setStageEditForm] = useState({ name: '', order_index: 1, latitude: '', longitude: '' })
  const [fareEditForm, setFareEditForm] = useState({ from_stage_id: '', to_stage_id: '', fare_amount: '' })
  const [saving, setSaving] = useState(false)

  const loadRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').eq('sacco_id', profile.sacco_id).order('name')
    setRoutes(data || [])
  }

  useEffect(() => {
    if (profile?.sacco_id) loadRoutes()
  }, [profile])

  const loadRouteDetails = async (routeId) => {
    setSelectedRoute(routeId)
    const [{ data: s }, { data: f }] = await Promise.all([
      supabase.from('route_stages').select('*').eq('route_id', routeId).order('order_index'),
      supabase.from('stage_fares').select('*, from_stage:from_stage_id(name), to_stage:to_stage_id(name)').eq('route_id', routeId),
    ])
    setStages(s || [])
    setFares(f || [])
  }

  const addRoute = async (e) => {
    e.preventDefault()
    await supabase.from('routes').insert({ ...routeForm, sacco_id: profile.sacco_id })
    setRouteForm({ name: '', description: '' })
    loadRoutes()
  }

  const addStage = async (e) => {
    e.preventDefault()
    await supabase.from('route_stages').insert({
      route_id: selectedRoute,
      name: stageForm.name,
      order_index: Number(stageForm.order_index),
      latitude: stageForm.latitude ? Number(stageForm.latitude) : null,
      longitude: stageForm.longitude ? Number(stageForm.longitude) : null,
    })
    setStageForm({ name: '', order_index: stages.length + 1, latitude: '', longitude: '' })
    loadRouteDetails(selectedRoute)
  }

  const addFare = async (e) => {
    e.preventDefault()
    await supabase.from('stage_fares').insert({
      route_id: selectedRoute,
      from_stage_id: fareForm.from_stage_id,
      to_stage_id: fareForm.to_stage_id,
      fare_amount: Number(fareForm.fare_amount),
    })
    setFareForm({ from_stage_id: '', to_stage_id: '', fare_amount: '' })
    loadRouteDetails(selectedRoute)
  }

  const openEditRoute = (r) => {
    setEditRoute(r)
    setRouteEditForm({ name: r.name, description: r.description || '' })
  }

  const saveRoute = async () => {
    setSaving(true)
    try {
      await updateRoute(editRoute.id, routeEditForm)
      setMessage('Route updated')
      setEditRoute(null)
      loadRoutes()
      if (selectedRoute === editRoute.id) loadRouteDetails(selectedRoute)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const deactivateRouteHandler = async () => {
    if (!window.confirm(`Deactivate route "${editRoute.name}"?`)) return
    setSaving(true)
    try {
      await deactivateRoute(editRoute.id)
      setMessage('Route deactivated')
      setEditRoute(null)
      loadRoutes()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openEditStage = (s) => {
    setEditStage(s)
    setStageEditForm({
      name: s.name,
      order_index: s.order_index,
      latitude: s.latitude ?? '',
      longitude: s.longitude ?? '',
    })
  }

  const saveStage = async () => {
    setSaving(true)
    try {
      await updateRouteStage(editStage.id, {
        name: stageEditForm.name,
        order_index: Number(stageEditForm.order_index),
        latitude: stageEditForm.latitude ? Number(stageEditForm.latitude) : null,
        longitude: stageEditForm.longitude ? Number(stageEditForm.longitude) : null,
      })
      setMessage('Stage updated')
      setEditStage(null)
      loadRouteDetails(selectedRoute)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteStage = async () => {
    if (!window.confirm(`Delete stage "${editStage.name}"?`)) return
    setSaving(true)
    try {
      await deleteRouteStage(editStage.id)
      setMessage('Stage deleted')
      setEditStage(null)
      loadRouteDetails(selectedRoute)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openEditFare = (f) => {
    setEditFare(f)
    setFareEditForm({
      from_stage_id: f.from_stage_id,
      to_stage_id: f.to_stage_id,
      fare_amount: f.fare_amount,
    })
  }

  const saveFare = async () => {
    setSaving(true)
    try {
      await updateRouteFare(editFare.id, {
        from_stage_id: fareEditForm.from_stage_id,
        to_stage_id: fareEditForm.to_stage_id,
        fare_amount: Number(fareEditForm.fare_amount),
      })
      setMessage('Fare updated')
      setEditFare(null)
      loadRouteDetails(selectedRoute)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteFare = async () => {
    if (!window.confirm('Delete this fare?')) return
    setSaving(true)
    try {
      await deleteRouteFare(editFare.id)
      setMessage('Fare deleted')
      setEditFare(null)
      loadRouteDetails(selectedRoute)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Njia & Nauli / Routes & Fares">
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <form onSubmit={addRoute} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="font-semibold">New Route</h3>
            <input placeholder="Route name" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
            <input placeholder="Description" value={routeForm.description} onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
            <button type="submit" className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white">Add Route</button>
          </form>

          <div className="space-y-2">
            {routes.map((r) => (
              <div key={r.id} className={`flex items-center gap-2 rounded-lg border p-2 ${selectedRoute === r.id ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
                <button onClick={() => loadRouteDetails(r.id)} className="flex-1 p-1 text-left text-sm">
                  {r.name}
                  {!r.is_active && <span className="ml-2 text-xs text-red-500">(inactive)</span>}
                </button>
                <button type="button" onClick={() => openEditRoute(r)} className="rounded border px-2 py-1 text-xs">Edit</button>
              </div>
            ))}
          </div>
        </div>

        {selectedRoute && (
          <>
            <form onSubmit={addStage} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Add Stage</h3>
              <input placeholder="Stage name" value={stageForm.name} onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
              <input type="number" placeholder="Order" value={stageForm.order_index} onChange={(e) => setStageForm({ ...stageForm, order_index: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="Latitude" value={stageForm.latitude} onChange={(e) => setStageForm({ ...stageForm, latitude: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="Longitude" value={stageForm.longitude} onChange={(e) => setStageForm({ ...stageForm, longitude: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">Add Stage</button>
              <div className="mt-2 space-y-1">
                {stages.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.order_index}. {s.name}</span>
                    <button type="button" onClick={() => openEditStage(s)} className="text-xs text-green-700">Edit</button>
                  </div>
                ))}
              </div>
            </form>

            <form onSubmit={addFare} className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Add Fare</h3>
              <select value={fareForm.from_stage_id} onChange={(e) => setFareForm({ ...fareForm, from_stage_id: e.target.value })} className="w-full rounded-lg border px-3 py-2" required>
                <option value="">From stage</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={fareForm.to_stage_id} onChange={(e) => setFareForm({ ...fareForm, to_stage_id: e.target.value })} className="w-full rounded-lg border px-3 py-2" required>
                <option value="">To stage</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="number" placeholder="Fare (KES)" value={fareForm.fare_amount} onChange={(e) => setFareForm({ ...fareForm, fare_amount: e.target.value })} className="w-full rounded-lg border px-3 py-2" required />
              <button type="submit" className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white">Add Fare</button>
              <div className="mt-2 space-y-1">
                {fares.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span>{f.from_stage?.name} → {f.to_stage?.name}: {formatCurrency(f.fare_amount)}</span>
                    <button type="button" onClick={() => openEditFare(f)} className="text-xs text-green-700">Edit</button>
                  </div>
                ))}
              </div>
            </form>
          </>
        )}
      </div>

      <AdminEditModal open={!!editRoute} title="Edit Route" onClose={() => setEditRoute(null)} onSave={saveRoute} onDelete={deactivateRouteHandler} deleteLabel="Deactivate" saving={saving}>
        <input value={routeEditForm.name} onChange={(e) => setRouteEditForm({ ...routeEditForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Route name" />
        <input value={routeEditForm.description} onChange={(e) => setRouteEditForm({ ...routeEditForm, description: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Description" />
      </AdminEditModal>

      <AdminEditModal open={!!editStage} title="Edit Stage" onClose={() => setEditStage(null)} onSave={saveStage} onDelete={deleteStage} saving={saving}>
        <input value={stageEditForm.name} onChange={(e) => setStageEditForm({ ...stageEditForm, name: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
        <input type="number" value={stageEditForm.order_index} onChange={(e) => setStageEditForm({ ...stageEditForm, order_index: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
        <input value={stageEditForm.latitude} onChange={(e) => setStageEditForm({ ...stageEditForm, latitude: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Latitude" />
        <input value={stageEditForm.longitude} onChange={(e) => setStageEditForm({ ...stageEditForm, longitude: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Longitude" />
      </AdminEditModal>

      <AdminEditModal open={!!editFare} title="Edit Fare" onClose={() => setEditFare(null)} onSave={saveFare} onDelete={deleteFare} saving={saving}>
        <select value={fareEditForm.from_stage_id} onChange={(e) => setFareEditForm({ ...fareEditForm, from_stage_id: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={fareEditForm.to_stage_id} onChange={(e) => setFareEditForm({ ...fareEditForm, to_stage_id: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="number" value={fareEditForm.fare_amount} onChange={(e) => setFareEditForm({ ...fareEditForm, fare_amount: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
      </AdminEditModal>
    </Layout>
  )
}
