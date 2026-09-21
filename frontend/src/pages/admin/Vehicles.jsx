import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import AdminEditModal from '../../components/AdminEditModal'
import { supabase } from '../../lib/supabase'
import {
  assignDriver,
  deactivateAdminVehicle,
  fetchAdminDrivers,
  getApiErrorMessage,
  unassignDriver,
  updateAdminAssignment,
  updateAdminVehicle,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminVehicles() {
  const { profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [owners, setOwners] = useState([])
  const [drivers, setDrivers] = useState([])
  const [routes, setRoutes] = useState([])
  const [form, setForm] = useState({ plate_number: '', capacity: 14, owner_id: '', status: 'active' })
  const [assignForm, setAssignForm] = useState({ driver_id: '', vehicle_id: '', route_id: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [editAssignment, setEditAssignment] = useState(null)
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', capacity: 14, owner_id: '', status: 'active' })
  const [assignmentForm, setAssignmentForm] = useState({ vehicle_id: '', route_id: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile?.sacco_id) return
    const [{ data: v }, { data: o }, { data: r }, { data: a }, allDrivers] = await Promise.all([
      supabase.from('vehicles').select('*, profiles:owner_id(full_name)').eq('sacco_id', profile.sacco_id),
      supabase.from('profiles').select('id, full_name').eq('sacco_id', profile.sacco_id).eq('role', 'owner'),
      supabase.from('routes').select('id, name').eq('sacco_id', profile.sacco_id),
      supabase.from('driver_assignments').select('*, profiles:driver_id(full_name), vehicles(plate_number), routes(name)').eq('is_active', true).order('created_at', { ascending: false }),
      fetchAdminDrivers(),
    ])
    setVehicles(v || [])
    setOwners(o || [])
    setDrivers(allDrivers || [])
    setRoutes(r || [])
    setAssignments(a || [])
  }

  useEffect(() => {
    if (profile?.sacco_id) load()
  }, [profile])

  const handleAddVehicle = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error: insertError } = await supabase.from('vehicles').insert({
      ...form,
      sacco_id: profile.sacco_id,
      owner_id: form.owner_id || null,
      capacity: Number(form.capacity),
      plate_number: form.plate_number.trim().toUpperCase(),
    })
    if (insertError) {
      setError(insertError.message)
      return
    }
    setMessage('Vehicle added successfully')
    setForm({ plate_number: '', capacity: 14, owner_id: '', status: 'active' })
    load()
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssigning(true)
    try {
      await assignDriver(assignForm)
      setMessage('Driver assigned successfully!')
      setAssignForm({ driver_id: '', vehicle_id: '', route_id: '' })
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setAssigning(false)
    }
  }

  const openEditVehicle = (v) => {
    setEditVehicle(v)
    setVehicleForm({
      plate_number: v.plate_number,
      capacity: v.capacity,
      owner_id: v.owner_id || '',
      status: v.status || 'active',
    })
  }

  const saveVehicle = async () => {
    setSaving(true)
    try {
      await updateAdminVehicle(editVehicle.id, {
        ...vehicleForm,
        capacity: Number(vehicleForm.capacity),
        owner_id: vehicleForm.owner_id || null,
      })
      setMessage('Vehicle updated')
      setEditVehicle(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const deactivateVehicle = async () => {
    if (!window.confirm(`Deactivate ${editVehicle.plate_number}?`)) return
    setSaving(true)
    try {
      await deactivateAdminVehicle(editVehicle.id)
      setMessage('Vehicle deactivated')
      setEditVehicle(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openEditAssignment = (a) => {
    setEditAssignment(a)
    setAssignmentForm({ vehicle_id: a.vehicle_id, route_id: a.route_id || '' })
  }

  const saveAssignment = async () => {
    setSaving(true)
    try {
      await updateAdminAssignment(editAssignment.id, {
        vehicle_id: assignmentForm.vehicle_id,
        route_id: assignmentForm.route_id || null,
      })
      setMessage('Assignment updated')
      setEditAssignment(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUnassign = async () => {
    if (!window.confirm('Remove this driver assignment?')) return
    setSaving(true)
    try {
      await unassignDriver(editAssignment.id)
      setMessage('Assignment removed')
      setEditAssignment(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!profile?.sacco_id) {
    return (
      <Layout title="Magari / Vehicles">
        <p className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">Your admin account has no SACCO linked.</p>
      </Layout>
    )
  }

  return (
    <Layout title="Magari / Vehicles">
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleAddVehicle} className="space-y-3 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Ongeza Gari / Add Vehicle</h3>
          <input placeholder="Plate number" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })} className="w-full rounded-lg border px-4 py-2" required />
          <input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full rounded-lg border px-4 py-2" />
          <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="w-full rounded-lg border px-4 py-2">
            <option value="">Select owner (optional)</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
          </select>
          <button type="submit" className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white">Add Vehicle</button>
        </form>

        <form onSubmit={handleAssign} className="space-y-3 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Panga Dereva / Assign Driver</h3>
          <select value={assignForm.driver_id} onChange={(e) => setAssignForm({ ...assignForm, driver_id: e.target.value })} className="w-full rounded-lg border px-4 py-2" required>
            <option value="">Select driver</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
          <select value={assignForm.vehicle_id} onChange={(e) => setAssignForm({ ...assignForm, vehicle_id: e.target.value })} className="w-full rounded-lg border px-4 py-2" required>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
          </select>
          <select value={assignForm.route_id} onChange={(e) => setAssignForm({ ...assignForm, route_id: e.target.value })} className="w-full rounded-lg border px-4 py-2">
            <option value="">Select route (optional)</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button type="submit" disabled={assigning} className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-50">
            {assigning ? 'Assigning...' : 'Assign Driver'}
          </button>
        </form>
      </div>

      {assignments.length > 0 && (
        <div className="mt-6 rounded-xl border bg-white shadow-sm">
          <h3 className="border-b p-4 font-semibold">Active Assignments</h3>
          <div className="divide-y">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="font-medium">{a.profiles?.full_name}</span>
                <span>{a.vehicles?.plate_number}</span>
                <span className="text-gray-500">{a.routes?.name || 'Any route'}</span>
                <button type="button" onClick={() => openEditAssignment(a)} className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50">Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4">Plate</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Capacity</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="p-4 font-medium">{v.plate_number}</td>
                <td className="p-4">{v.profiles?.full_name || '—'}</td>
                <td className="p-4">{v.capacity}</td>
                <td className="p-4 capitalize">{v.status}</td>
                <td className="p-4">
                  <button type="button" onClick={() => openEditVehicle(v)} className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminEditModal open={!!editVehicle} title={`Edit ${editVehicle?.plate_number}`} onClose={() => setEditVehicle(null)} onSave={saveVehicle} onDelete={deactivateVehicle} deleteLabel="Deactivate" saving={saving}>
        <input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value.toUpperCase() })} className="w-full rounded-lg border px-3 py-2" placeholder="Plate number" />
        <input type="number" value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Capacity" />
        <select value={vehicleForm.owner_id} onChange={(e) => setVehicleForm({ ...vehicleForm, owner_id: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          <option value="">No owner</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
        <select value={vehicleForm.status} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>
      </AdminEditModal>

      <AdminEditModal open={!!editAssignment} title="Edit Assignment" onClose={() => setEditAssignment(null)} onSave={saveAssignment} onDelete={handleUnassign} deleteLabel="Unassign" saving={saving}>
        <p className="text-sm text-gray-600">Driver: {editAssignment?.profiles?.full_name}</p>
        <select value={assignmentForm.vehicle_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, vehicle_id: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
        </select>
        <select value={assignmentForm.route_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, route_id: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          <option value="">Any route</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </AdminEditModal>
    </Layout>
  )
}
