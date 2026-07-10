import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { fetchAdminSettings, getApiErrorMessage, updateAdminSettings } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminSettings() {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    sacco_name: '',
    sacco_description: '',
    owner_earnings_percentage: 70,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => {
        setForm({
          sacco_name: data.sacco?.name || '',
          sacco_description: data.sacco?.description || '',
          owner_earnings_percentage: data.settings?.owner_earnings_percentage ?? 70,
        })
      })
      .catch((err) => setError(getApiErrorMessage(err)))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await updateAdminSettings({
        sacco_name: form.sacco_name,
        sacco_description: form.sacco_description,
        owner_earnings_percentage: Number(form.owner_earnings_percentage),
      })
      setMessage('Settings saved')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Mipangilio / Settings">
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSave} className="max-w-lg space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="font-semibold">SACCO Settings</h3>
        <p className="text-sm text-gray-500">Logged in as {profile?.full_name}</p>

        <div>
          <label className="mb-1 block text-sm font-medium">SACCO Name</label>
          <input
            value={form.sacco_name}
            onChange={(e) => setForm({ ...form, sacco_name: e.target.value })}
            className="w-full rounded-lg border px-4 py-2"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <input
            value={form.sacco_description}
            onChange={(e) => setForm({ ...form, sacco_description: e.target.value })}
            className="w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Owner earnings % (verified payments)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={form.owner_earnings_percentage}
            onChange={(e) => setForm({ ...form, owner_earnings_percentage: e.target.value })}
            className="w-full rounded-lg border px-4 py-2"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Default 70% — owner gets this share when driver verifies payment.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </Layout>
  )
}
