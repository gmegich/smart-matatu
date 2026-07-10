import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import AdminEditModal from '../../components/AdminEditModal'
import PasswordInput from '../../components/PasswordInput'
import { supabase, formatCurrency } from '../../lib/supabase'
import {
  createAdminVehicle,
  createStaffUser,
  deleteAdminUser,
  fetchAdminDrivers,
  fetchOwnerVehicles,
  fetchPassengerWallets,
  getApiErrorMessage,
  updateAdminUser,
  updatePassengerProfile,
} from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const ROLE_LABELS = {
  driver: 'Driver / Dereva',
  owner: 'Vehicle Owner / Mmiliki',
  admin: 'Admin',
  passenger: 'Passenger / Abiria',
}

const emptyForm = {
  email: '',
  full_name: '',
  phone: '',
  role: 'driver',
  password: '',
  initial_wallet_balance: '',
  vehicles: [{ plate_number: '', capacity: 14 }],
}

export default function AdminUsers() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [passengers, setPassengers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: 'driver', password: '' })
  const [saving, setSaving] = useState(false)
  const [ownerVehicles, setOwnerVehicles] = useState([])
  const [newVehicle, setNewVehicle] = useState({ plate_number: '', capacity: 14 })
  const [addingVehicle, setAddingVehicle] = useState(false)

  const load = async () => {
    const [{ data }, allDrivers, passengerData] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('sacco_id', profile.sacco_id)
        .neq('role', 'passenger')
        .order('created_at', { ascending: false }),
      fetchAdminDrivers(),
      fetchPassengerWallets(),
    ])
    setUsers(data || [])
    setDrivers(allDrivers || [])
    setPassengers(passengerData?.passengers || [])
  }

  useEffect(() => {
    if (profile?.sacco_id) load()
  }, [profile])

  const openEdit = (user, isPassenger = false) => {
    setEditUser({ ...user, isPassenger })
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'passenger',
      password: '',
    })
    setOwnerVehicles([])
    setNewVehicle({ plate_number: '', capacity: 14 })
    if (user.role === 'owner') {
      loadOwnerVehicles(user.id)
    }
  }

  const loadOwnerVehicles = async (ownerId) => {
    try {
      const vehicles = await fetchOwnerVehicles(ownerId)
      setOwnerVehicles(vehicles)
    } catch {
      setOwnerVehicles([])
    }
  }

  const handleAddOwnerVehicle = async () => {
    const plate = newVehicle.plate_number.trim()
    if (!plate) {
      setError('Enter a number plate for the new vehicle')
      return
    }
    setAddingVehicle(true)
    setError('')
    try {
      await createAdminVehicle({
        plate_number: plate,
        capacity: Number(newVehicle.capacity) || 14,
        owner_id: editUser.id,
      })
      setMessage(`Vehicle ${plate.toUpperCase()} added to ${editUser.full_name}`)
      setNewVehicle({ plate_number: '', capacity: 14 })
      loadOwnerVehicles(editUser.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setAddingVehicle(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
      }
      if (form.role === 'passenger' && form.initial_wallet_balance) {
        payload.initial_wallet_balance = Number(form.initial_wallet_balance)
      }
      if (form.role === 'owner') {
        const cleaned = form.vehicles
          .map((v) => ({ plate_number: v.plate_number.trim(), capacity: Number(v.capacity) || 14 }))
          .filter((v) => v.plate_number)
        if (!cleaned.length) {
          setError('Add at least one number plate for the owner')
          return
        }
        payload.vehicles = cleaned
      }
      const result = await createStaffUser(payload)
      const label = ROLE_LABELS[form.role] || form.role
      const walletNote =
        form.role === 'passenger' && result.wallet_balance > 0
          ? ` Wallet: ${formatCurrency(result.wallet_balance)}.`
          : ''
      const plates = (result.vehicles || []).map((v) => v.plate_number).join(', ')
      const vehicleNote = form.role === 'owner' && plates ? ` Vehicles: ${plates}.` : ''
      setMessage(`${label} account created successfully.${walletNote}${vehicleNote}`)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not create user')
    }
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        full_name: editForm.full_name,
        phone: editForm.phone,
      }
      if (!editUser.isPassenger) {
        payload.role = editForm.role
      }
      if (editForm.password) payload.password = editForm.password

      if (editUser.isPassenger) {
        await updatePassengerProfile(editUser.id, payload)
      } else {
        await updateAdminUser(editUser.id, payload)
      }
      setMessage('User updated successfully')
      setEditUser(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!editUser || !window.confirm(`Delete ${editUser.full_name}? This cannot be undone.`)) return
    setSaving(true)
    try {
      await deleteAdminUser(editUser.id)
      setMessage('User deleted')
      setEditUser(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const UserRow = ({ user, isPassenger }) => (
    <div className="flex items-center justify-between gap-2 p-4">
      <div>
        <p className="font-medium">{user.full_name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        {user.phone && <p className="text-sm text-gray-600">{user.phone}</p>}
      </div>
      <div className="flex items-center gap-2">
        {isPassenger && (
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
            {formatCurrency(user.balance)}
          </span>
        )}
        {!isPassenger && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
            {ROLE_LABELS[user.role] || user.role}
          </span>
        )}
        <button
          type="button"
          onClick={() => openEdit(user, isPassenger)}
          className="rounded-lg border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
      </div>
    </div>
  )

  return (
    <Layout title="Watumiaji / Users">
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Ongeza Mtumiaji / Add User</h3>
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full rounded-lg border px-4 py-2" required />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border px-4 py-2" required />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border px-4 py-2" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border px-4 py-2">
            <option value="passenger">Passenger / Abiria</option>
            <option value="driver">Driver / Dereva</option>
            <option value="owner">Vehicle Owner / Mmiliki</option>
            <option value="admin">Admin</option>
          </select>
          {form.role === 'passenger' && (
            <input type="number" min="0" step="1" placeholder="Opening wallet balance (KES, optional)" value={form.initial_wallet_balance} onChange={(e) => setForm({ ...form, initial_wallet_balance: e.target.value })} className="w-full rounded-lg border px-4 py-2" />
          )}
          {form.role === 'owner' && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">Magari / Vehicles</p>
              {form.vehicles.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Number plate *"
                    value={v.plate_number}
                    onChange={(e) => {
                      const vehicles = [...form.vehicles]
                      vehicles[i] = { ...vehicles[i], plate_number: e.target.value.toUpperCase() }
                      setForm({ ...form, vehicles })
                    }}
                    className="flex-1 rounded-lg border px-3 py-2"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Seats"
                    value={v.capacity}
                    onChange={(e) => {
                      const vehicles = [...form.vehicles]
                      vehicles[i] = { ...vehicles[i], capacity: e.target.value }
                      setForm({ ...form, vehicles })
                    }}
                    className="w-20 rounded-lg border px-3 py-2"
                  />
                  {form.vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, vehicles: form.vehicles.filter((_, idx) => idx !== i) })}
                      className="rounded-lg border border-red-300 px-3 text-sm text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, vehicles: [...form.vehicles, { plate_number: '', capacity: 14 }] })}
                className="text-sm font-semibold text-green-700 hover:underline"
              >
                + Ongeza gari / Add another vehicle
              </button>
            </div>
          )}
          <PasswordInput placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} inputClassName="px-4 py-2" minLength={6} required />
          <button type="submit" className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white">Create User</button>
        </form>

        <div className="rounded-xl border bg-white shadow-sm">
          <h3 className="border-b p-4 font-semibold">Staff List (your SACCO)</h3>
          <div className="divide-y">
            {users.map((u) => <UserRow key={u.id} user={u} />)}
            {users.length === 0 && <p className="p-4 text-sm text-gray-500">No staff in your SACCO yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <h3 className="border-b p-4 font-semibold">Abiria / Passengers</h3>
        <div className="divide-y">
          {passengers.map((p) => <UserRow key={p.id} user={p} isPassenger />)}
          {passengers.length === 0 && <p className="p-4 text-sm text-gray-500">No passengers yet.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <h3 className="border-b p-4 font-semibold">Madereva Wote / All Drivers</h3>
        <div className="divide-y">
          {drivers.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{d.full_name}</p>
                <p className="text-sm text-gray-500">{d.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">{d.saccos?.name || 'No SACCO'}</span>
                <button type="button" onClick={() => openEdit(d)} className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdminEditModal
        open={!!editUser}
        title={`Edit ${editUser?.full_name || 'User'}`}
        onClose={() => setEditUser(null)}
        onSave={handleSaveEdit}
        onDelete={editUser?.id !== profile?.id ? handleDeleteUser : undefined}
        deleteLabel="Delete User"
        saving={saving}
      >
        <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border px-3 py-2" />
        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border px-3 py-2" />
        {!editUser?.isPassenger && (
          <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full rounded-lg border px-3 py-2">
            <option value="driver">Driver</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="passenger">Passenger</option>
          </select>
        )}
        <PasswordInput value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="New password (optional)" inputClassName="px-3 py-2" minLength={6} />

        {editUser?.role === 'owner' && (
          <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-700">Magari ya mmiliki / Owner's vehicles</p>
            {ownerVehicles.length === 0 ? (
              <p className="text-xs text-gray-500">No vehicles linked yet.</p>
            ) : (
              <ul className="space-y-1">
                {ownerVehicles.map((v) => (
                  <li key={v.id} className="flex justify-between text-sm">
                    <span className="font-medium">{v.plate_number}</span>
                    <span className="text-gray-500 capitalize">{v.capacity} seats · {v.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-medium text-gray-600">Ongeza gari jipya / Add a new car</p>
              <div className="flex gap-2">
                <input
                  placeholder="Number plate"
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value.toUpperCase() })}
                  className="flex-1 rounded-lg border px-3 py-2"
                />
                <input
                  type="number"
                  min="1"
                  max="50"
                  placeholder="Seats"
                  value={newVehicle.capacity}
                  onChange={(e) => setNewVehicle({ ...newVehicle, capacity: e.target.value })}
                  className="w-20 rounded-lg border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleAddOwnerVehicle}
                  disabled={addingVehicle}
                  className="rounded-lg bg-green-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {addingVehicle ? '...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminEditModal>
    </Layout>
  )
}
