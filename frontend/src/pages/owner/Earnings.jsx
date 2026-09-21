import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { formatCurrency, formatDate } from '../../lib/supabase'
import { fetchOwnerEarnings, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function OwnerEarnings() {
  const { profile } = useAuth()
  const [earnings, setEarnings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOwnerEarnings()
      .then((data) => {
        setEarnings(data?.earnings || [])
        setTotal(data?.total || 0)
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [profile])

  return (
    <Layout title="Mapato / Earnings">
      <div className="mb-6 rounded-xl bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
        <p className="text-sm opacity-80">Jumla ya Mapato Yako / Your total earnings</p>
        <p className="text-3xl font-bold">{formatCurrency(total)}</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4">Tarehe / Date</th>
              <th className="p-4">Gari / Vehicle</th>
              <th className="p-4">Jumla / Total</th>
              <th className="p-4">Sehemu Yako / Your Share</th>
              <th className="p-4">SACCO</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {earnings.map((e) => (
              <tr key={e.id}>
                <td className="p-4">{formatDate(e.created_at)}</td>
                <td className="p-4">{e.vehicles?.plate_number || '—'}</td>
                <td className="p-4">{formatCurrency(e.total_amount)}</td>
                <td className="p-4 font-semibold text-green-700">{formatCurrency(e.owner_share)}</td>
                <td className="p-4 text-gray-500">{formatCurrency(e.sacco_share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <p className="p-8 text-center text-gray-500">Inapakia / Loading...</p>
        ) : (
          earnings.length === 0 && (
            <p className="p-8 text-center text-gray-500">
              Hakuna mapato bado. Mapato huongezeka dereva akithibitisha malipo.
              <br />
              No earnings yet — these appear once a driver verifies a passenger payment.
            </p>
          )
        )}
      </div>
    </Layout>
  )
}
