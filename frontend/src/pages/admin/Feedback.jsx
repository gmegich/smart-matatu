import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StarRating from '../../components/StarRating'
import { formatCurrency, formatDate } from '../../lib/supabase'
import { fetchAdminFeedback, getApiErrorMessage } from '../../lib/api'

export default function AdminFeedback() {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ count: 0, average: null })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminFeedback()
      .then((data) => {
        setItems(data.feedback || [])
        setSummary(data.summary || { count: 0, average: null })
        setNotice(data.message || '')
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout title="Maoni ya Abiria / Passenger Feedback">
      <p className="mb-4 text-sm text-gray-600">
        Ratings and feedback from passengers after each trip (1–5 stars).
      </p>

      {notice && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total feedback</p>
          <p className="text-2xl font-bold">{summary.count}</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-800">Average rating</p>
          <p className="text-2xl font-bold text-amber-900">
            {summary.average != null ? `${summary.average} / 5` : '—'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No feedback yet.</p>
        ) : (
          <div className="divide-y">
            {items.map((row) => {
              const payment = row.payment || {}
              return (
                <div key={row.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.passenger?.full_name || 'Passenger'}</p>
                      <p className="text-sm text-gray-500">{payment.routes?.name}</p>
                      <p className="text-xs text-gray-500">
                        {payment.from_stage?.name} → {payment.to_stage?.name} ·{' '}
                        {payment.vehicles?.plate_number || 'Matatu'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Driver: {row.driver?.full_name || '—'} · {formatDate(row.created_at)}
                      </p>
                    </div>
                    <StarRating value={row.rating} disabled size="sm" />
                  </div>
                  {row.comment && (
                    <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm italic text-gray-700">
                      &ldquo;{row.comment}&rdquo;
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Fare: {formatCurrency(payment.amount)} · Code: {payment.payment_code}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
