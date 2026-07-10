import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import PhoneContact from '../../components/PhoneContact'
import StarRating from '../../components/StarRating'
import { formatCurrency, formatDate } from '../../lib/supabase'
import {
  fetchMyPayments,
  fetchPaymentContact,
  fetchPaymentJourney,
  passengerArrive,
  submitTripFeedback,
  getApiErrorMessage,
} from '../../lib/api'

function getFeedback(payment) {
  const r = payment?.trip_ratings
  if (!r) return null
  return Array.isArray(r) ? r[0] : r
}

function getTripState(payment, feedback) {
  if (payment.status === 'pending') return 'pending_verify'
  if (payment.status === 'verified') return 'arrive'
  if (payment.status === 'completed' && !feedback) return 'feedback'
  if (payment.status === 'completed' || payment.arrived_at) return 'done'
  return null
}

export default function CompleteTrip() {
  const [payments, setPayments] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [journey, setJourney] = useState(null)
  const [contact, setContact] = useState(null)
  const [rating, setRating] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const loadPayments = async () => {
    setLoadError('')
    try {
      const data = await fetchMyPayments()
      const list = (data || []).filter((p) => !['expired', 'cancelled'].includes(p.status))
      setPayments(list)
      if (list.length === 1 && !selectedId) setSelectedId(list[0].id)
      return list
    } catch (err) {
      setLoadError(getApiErrorMessage(err))
      setPayments([])
      return []
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const selected = payments.find((p) => p.id === selectedId)
  const selectedFeedback = selected ? getFeedback(selected) : null
  const journeyFeedback = journey?.feedback || selectedFeedback
  const action = selected ? getTripState(selected, journeyFeedback) : null

  useEffect(() => {
    if (!selectedId) {
      setJourney(null)
      setContact(null)
      return
    }
    fetchPaymentJourney(selectedId)
      .then((j) => {
        setJourney(j)
        const fb = j?.feedback
        if (fb) {
          setRating(fb.rating)
          setFeedbackText(fb.comment || '')
        } else {
          setRating(null)
          setFeedbackText('')
        }
      })
      .catch(() => setJourney(null))
    fetchPaymentContact(selectedId)
      .then(setContact)
      .catch(() => setContact(null))
  }, [selectedId])

  const actionable = payments.filter((p) => {
    const state = getTripState(p, getFeedback(p))
    return state === 'arrive' || state === 'feedback' || state === 'pending_verify'
  })

  const handleArrive = async () => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await passengerArrive(selectedId)
      setMessage('Safari imekamilika! Sasa toa ukadiriaji na maoni yako.')
      await loadPayments()
      const j = await fetchPaymentJourney(selectedId)
      setJourney(j)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async () => {
    if (!selectedId || rating === null || rating === undefined) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await submitTripFeedback(selectedId, rating, feedbackText)
      setMessage('Asante kwa maoni yako!')
      await loadPayments()
      const j = await fetchPaymentJourney(selectedId)
      setJourney(j)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Maliza Safari / Complete Trip">
      <p className="mb-4 text-sm text-gray-600">
        Ukifika, thibitisha safari, kisha kadiria na uache maoni / When you arrive, confirm, rate, and
        leave feedback.
      </p>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {actionable.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{actionable.length}</strong> safari zinahitaji hatua yako.
        </div>
      )}

      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <h3 className="font-semibold text-gray-800">Safari zako / Your trips</h3>
          {pageLoading && <p className="text-sm text-gray-500">Inapakia...</p>}
          {payments.map((p) => {
            const fb = getFeedback(p)
            const state = getTripState(p, fb)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedId(p.id)
                  setMessage('')
                  setError('')
                  setRating(fb?.rating ?? null)
                  setFeedbackText(fb?.comment || '')
                }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedId === p.id
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'bg-white hover:border-green-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900">{p.routes?.name || 'Route'}</p>
                  {state === 'pending_verify' && (
                    <span className="shrink-0 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      Subiri
                    </span>
                  )}
                  {state === 'arrive' && (
                    <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Maliza
                    </span>
                  )}
                  {state === 'feedback' && (
                    <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Maoni
                    </span>
                  )}
                  {state === 'done' && (
                    <span className="shrink-0 text-amber-500">★{fb?.rating ?? '—'}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {p.from_stage?.name || '—'} → {p.to_stage?.name || '—'}
                </p>
                <p className="text-xs text-gray-500">
                  {p.vehicles?.plate_number || 'Matatu'} · {formatCurrency(p.amount)} ·{' '}
                  <span className="capitalize">{p.status}</span>
                </p>
              </button>
            )
          })}
          {!pageLoading && payments.length === 0 && (
            <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500">
              <p>Hakuna safari bado.</p>
              <Link to="/passenger/pay" className="mt-2 inline-block font-medium text-green-700 underline">
                Lipa nauli kwanza →
              </Link>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center text-gray-500">
              Chagua safari kutoka orodha / Select a trip from the list
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">{selected.routes?.name}</h3>
              <p className="text-sm text-gray-600">
                {selected.from_stage?.name} → <strong>{selected.to_stage?.name}</strong>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Msimbo: <strong>{selected.payment_code}</strong> · {formatCurrency(selected.amount)}
              </p>

              {contact?.driver && (
                <div className="mt-4">
                  <PhoneContact
                    label="Dereva / Driver"
                    name={contact.driver.full_name}
                    phone={contact.driver.phone}
                  />
                </div>
              )}

              {action === 'pending_verify' && (
                <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
                  <h4 className="font-semibold text-yellow-900">Subiri uthibitisho wa dereva</h4>
                  <p className="mt-2 text-sm text-yellow-800">
                    Onyesha msimbo <strong className="font-mono text-lg">{selected.payment_code}</strong> kwa
                    dereva.
                  </p>
                  <Link to="/passenger/track" className="mt-4 inline-block text-sm text-green-700 underline">
                    Fuatilia matatu →
                  </Link>
                </div>
              )}

              {(action === 'arrive' || action === 'feedback' || action === 'done') && (
                <div className="mt-6 flex gap-3">
                  <div
                    className={`flex-1 rounded-lg border-2 p-3 text-center text-sm ${
                      selected.status === 'completed' || journey?.status === 'completed' || action !== 'arrive'
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    <span className="text-lg">1</span>
                    <p className="font-medium">Nimefika</p>
                  </div>
                  <div
                    className={`flex-1 rounded-lg border-2 p-3 text-center text-sm ${
                      journeyFeedback || action === 'feedback'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    <span className="text-lg">2</span>
                    <p className="font-medium">Kadiria & Maoni</p>
                  </div>
                </div>
              )}

              {action === 'arrive' && (
                <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                  <h4 className="font-semibold text-green-900">Umefika {selected.to_stage?.name}?</h4>
                  <p className="mt-1 text-sm text-green-800">Bonyeza hapa ukishuka, kisha toa ukadiriaji.</p>
                  <button
                    type="button"
                    onClick={handleArrive}
                    disabled={loading}
                    className="mt-4 w-full rounded-lg bg-green-600 py-3.5 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Inahifadhi...' : '✓ Nimefika — Maliza Safari'}
                  </button>
                </div>
              )}

              {(action === 'arrive' || action === 'feedback') && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <h4 className="font-semibold text-gray-900">Ukadiriaji & Maoni / Rate & Feedback</h4>
                  <div className="my-4">
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Maoni yako kuhusu safari (optional) / Your trip feedback..."
                    rows={4}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleFeedback}
                    disabled={loading || rating === null || rating === undefined}
                    className="mt-4 w-full rounded-lg bg-amber-500 py-3.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {loading
                      ? 'Inatuma...'
                      : action === 'arrive'
                        ? '★ Tuma Ukadiriaji & Maliza Safari'
                        : '★ Tuma Maoni'}
                  </button>
                  {action === 'arrive' && (
                    <p className="mt-2 text-center text-xs text-gray-500">
                      Kutuma ukadiriaji pia kutamaliza safari yako.
                    </p>
                  )}
                </div>
              )}

              {action === 'done' && journeyFeedback && (
                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                  <p className="text-sm font-medium text-blue-900">Safari imekamilika — asante!</p>
                  <div className="my-3">
                    <StarRating value={journeyFeedback.rating} disabled size="md" label="" required={false} />
                  </div>
                  {journeyFeedback.comment && (
                    <p className="text-sm italic text-gray-700">&ldquo;{journeyFeedback.comment}&rdquo;</p>
                  )}
                  {(selected.arrived_at || journey?.arrived_at) && (
                    <p className="mt-2 text-xs text-gray-500">
                      Uliwasili: {formatDate(selected.arrived_at || journey?.arrived_at)}
                    </p>
                  )}
                  <Link
                    to="/passenger/pay"
                    className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Lipa safari nyingine →
                  </Link>
                </div>
              )}

              <p className="mt-6 text-center text-xs text-gray-500">
                <Link to="/passenger/track" className="text-green-700 underline">
                  Fuatilia matatu kwenye ramani
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
