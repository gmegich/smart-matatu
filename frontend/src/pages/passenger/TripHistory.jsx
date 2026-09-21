import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import StarRating from '../../components/StarRating'
import { formatCurrency, formatDate } from '../../lib/supabase'
import { fetchMyPayments } from '../../lib/api'

function getFeedback(p) {
  const r = p?.trip_ratings
  if (!r) return null
  return Array.isArray(r) ? r[0] : r
}

export default function TripHistory() {
  const [payments, setPayments] = useState([])

  useEffect(() => {
    fetchMyPayments().then((data) => setPayments(data || []))
  }, [])

  const statusLabel = (p) => {
    if (p.arrived_at || p.status === 'completed') return 'completed'
    return p.status
  }

  return (
    <Layout title="Historia ya Safari / Trip History">
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 font-semibold">Tarehe / Date</th>
                <th className="p-4 font-semibold">Njia / Route</th>
                <th className="p-4 font-semibold">Kutoka → Kwenda / From → To</th>
                <th className="p-4 font-semibold">Matatu</th>
                <th className="p-4 font-semibold">Nauli / Fare</th>
                <th className="p-4 font-semibold">Ukadiriaji / Rating</th>
                <th className="p-4 font-semibold">Hali / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => {
                const fb = getFeedback(p)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4">{formatDate(p.created_at)}</td>
                    <td className="p-4">{p.routes?.name}</td>
                    <td className="p-4">
                      {p.from_stage?.name} → {p.to_stage?.name}
                    </td>
                    <td className="p-4">{p.vehicles?.plate_number || '—'}</td>
                    <td className="p-4 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="p-4">
                      {fb ? (
                        <StarRating value={fb.rating} disabled size="sm" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs capitalize ${
                          statusLabel(p) === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : statusLabel(p) === 'verified'
                              ? 'bg-green-100 text-green-700'
                              : statusLabel(p) === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabel(p)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {payments.map((p) => {
            const fb = getFeedback(p)
            return (
              <div key={p.id} className="rounded-lg border p-4">
                <div className="flex justify-between">
                  <p className="font-semibold">{p.routes?.name}</p>
                  <span className="text-sm capitalize text-gray-500">{statusLabel(p)}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {p.from_stage?.name} → {p.to_stage?.name}
                </p>
                <p className="text-sm text-green-700">{formatCurrency(p.amount)}</p>
                {fb && (
                  <div className="mt-2">
                    <StarRating value={fb.rating} disabled size="sm" />
                  </div>
                )}
                <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
              </div>
            )
          })}
        </div>

        {payments.length === 0 && (
          <p className="p-8 text-center text-gray-500">Hakuna historia bado</p>
        )}
      </div>
    </Layout>
  )
}
