import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import AdminEditModal from '../../components/AdminEditModal'
import { formatCurrency } from '../../lib/supabase'
import {
  adminCreditWallet,
  adminDebitWallet,
  fetchPassengerWallets,
  getApiErrorMessage,
  updatePassengerProfile,
} from '../../lib/api'

export default function AdminWallets() {
  const [passengers, setPassengers] = useState([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [selectedUser, setSelectedUser] = useState('')
  const [amount, setAmount] = useState('')
  const [debitUser, setDebitUser] = useState('')
  const [debitAmount, setDebitAmount] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editPassenger, setEditPassenger] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchPassengerWallets()
      setPassengers(data.passengers || [])
      setTotalBalance(data.total_balance || 0)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleTopup = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!selectedUser || !amt) return
    setMessage('')
    setError('')
    try {
      const data = await adminCreditWallet(selectedUser, amt)
      setMessage(`Credited ${formatCurrency(amt)}. New balance: ${formatCurrency(data.balance)}`)
      setAmount('')
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const handleDebit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(debitAmount)
    if (!debitUser || !amt) return
    setMessage('')
    setError('')
    try {
      const data = await adminDebitWallet(debitUser, amt)
      setMessage(`Debited ${formatCurrency(amt)}. New balance: ${formatCurrency(data.balance)}`)
      setDebitAmount('')
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const openEdit = (p) => {
    setEditPassenger(p)
    setEditForm({ full_name: p.full_name, phone: p.phone || '' })
  }

  const savePassenger = async () => {
    setSaving(true)
    try {
      await updatePassengerProfile(editPassenger.id, editForm)
      setMessage('Passenger updated')
      setEditPassenger(null)
      load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Mikoba / Passenger Wallets">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Passengers</p>
          <p className="text-2xl font-bold">{passengers.length}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-5 shadow-sm">
          <p className="text-sm text-green-700">Total wallet balance</p>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Actions</p>
          <p className="text-sm font-medium">Credit or debit wallets below</p>
        </div>
      </div>

      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleTopup} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Ongeza Salio / Credit Wallet</h3>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full rounded-lg border px-4 py-2.5" required>
            <option value="">Select passenger</option>
            {passengers.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} — {formatCurrency(p.balance)}</option>
            ))}
          </select>
          <input type="number" min="1" placeholder="Amount (KES)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border px-4 py-2.5" required />
          <button type="submit" className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white">Credit Wallet</button>
        </form>

        <form onSubmit={handleDebit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Punguza Salio / Debit Wallet</h3>
          <select value={debitUser} onChange={(e) => setDebitUser(e.target.value)} className="w-full rounded-lg border px-4 py-2.5" required>
            <option value="">Select passenger</option>
            {passengers.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} — {formatCurrency(p.balance)}</option>
            ))}
          </select>
          <input type="number" min="1" placeholder="Amount (KES)" value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} className="w-full rounded-lg border px-4 py-2.5" required />
          <button type="submit" className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white">Debit Wallet</button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border bg-white shadow-sm">
        <h3 className="border-b p-4 font-semibold">Salio za Abiria / Passenger Balances</h3>
        {loading ? (
          <p className="p-4 text-gray-500">Loading...</p>
        ) : (
          <div className="divide-y">
            {passengers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-sm text-gray-500">{p.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(p.balance)}</p>
                  <button type="button" onClick={() => openEdit(p)} className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminEditModal open={!!editPassenger} title={`Edit ${editPassenger?.full_name}`} onClose={() => setEditPassenger(null)} onSave={savePassenger} saving={saving}>
        <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Full name" />
        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border px-3 py-2" placeholder="Phone" />
      </AdminEditModal>
    </Layout>
  )
}
