import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../../components/Layout'
import PhoneContact from '../../components/PhoneContact'
import { supabase, formatCurrency } from '../../lib/supabase'
import { createPayment, fetchMyWallet, fetchOpenTrip, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { encodePaymentQr } from '../../lib/qrPayload'

export default function PayFare() {
  const { user, loading: authLoading } = useAuth()
  const [routes, setRoutes] = useState([])
  const [routeId, setRouteId] = useState('')
  const [stages, setStages] = useState([])
  const [fromStage, setFromStage] = useState('')
  const [toStage, setToStage] = useState('')
  const [activeCount, setActiveCount] = useState(0)
  const [fare, setFare] = useState(null)
  const [walletBalance, setWalletBalance] = useState(null)
  const [payment, setPayment] = useState(null)
  const [openTrip, setOpenTrip] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadWallet = async () => {
    try {
      const w = await fetchMyWallet()
      setWalletBalance(w?.balance ?? 0)
    } catch {
      setWalletBalance(0)
    }
  }

  useEffect(() => {
    if (authLoading || !user) return
    supabase.from('routes').select('*').eq('is_active', true).then(({ data }) => setRoutes(data || []))
    loadWallet()
    fetchOpenTrip()
      .then(setOpenTrip)
      .catch(() => setOpenTrip(null))
  }, [authLoading, user])

  useEffect(() => {
    if (!routeId) return

    supabase
      .from('route_stages')
      .select('*')
      .eq('route_id', routeId)
      .order('order_index')
      .then(({ data }) => setStages(data || []))
  }, [routeId])

  useEffect(() => {
    if (!routeId) {
      setActiveCount(0)
      return
    }

    const loadTrips = () => {
      supabase
        .from('trips')
        .select('id, is_full')
        .eq('route_id', routeId)
        .eq('status', 'active')
        .then(({ data }) => {
          setActiveCount((data || []).filter((t) => !t.is_full).length)
        })
    }

    loadTrips()

    const channel = supabase
      .channel(`pay-trips-${routeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, loadTrips)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [routeId])

  useEffect(() => {
    if (!routeId || !fromStage || !toStage) {
      setFare(null)
      return
    }
    supabase
      .from('stage_fares')
      .select('fare_amount, from_stage_id, to_stage_id')
      .eq('route_id', routeId)
      .or(
        `and(from_stage_id.eq.${fromStage},to_stage_id.eq.${toStage}),and(from_stage_id.eq.${toStage},to_stage_id.eq.${fromStage})`
      )
      .then(({ data, error: fareError }) => {
        if (fareError || !data?.length) setFare(null)
        else setFare(data[0].fare_amount)
      })
  }, [routeId, fromStage, toStage])

  const fromStages = stages.filter((s) => s.id !== toStage)
  const toStages = stages.filter((s) => s.id !== fromStage)

  const canPay = !openTrip && fare && fromStage && toStage && routeId

  const handlePay = async () => {
    if (!canPay) return
    setError('')
    setLoading(true)
    try {
      const data = await createPayment({
        route_id: routeId,
        from_stage_id: fromStage,
        to_stage_id: toStage,
      })
      setPayment(data)
      setWalletBalance(data.balance)
      setOpenTrip({ id: data.payment_id, payment_code: data.payment_code, status: 'pending' })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Lipa Nauli / Pay Fare">
      <div className="mx-auto max-w-2xl">
        {!payment ? (
          <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">
              Lipa kabla ya kupanda. Onyesha msimbo au QR kwa dereva.
            </p>

            {openTrip && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Una safari hai / You have an active trip</p>
                <p className="mt-1">
                  Msimbo: <strong>{openTrip.payment_code}</strong>
                  {openTrip.routes?.name && <> · {openTrip.routes.name}</>}
                  {' · '}
                  <span className="capitalize">{openTrip.status}</span>
                </p>
                <p className="mt-2 text-amber-800">
                  Maliza safari hii kwanza kabla ya kulipa nyingine.
                </p>
                <Link
                  to="/passenger/complete-trip"
                  className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Maliza Safari →
                </Link>
              </div>
            )}

            {walletBalance !== null && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                Salio lako: <strong>{formatCurrency(walletBalance)}</strong>
                {Number(walletBalance) === 0 && (
                  <span className="ml-2 text-amber-700">
                    — <Link to="/passenger/wallet" className="underline">Ongeza salio kwanza</Link>
                  </span>
                )}
              </div>
            )}

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div>
              <label className="mb-1 block text-sm font-medium">Njia / Route</label>
              <select
                value={routeId}
                onChange={(e) => {
                  setRouteId(e.target.value)
                  setFromStage('')
                  setToStage('')
                  setTripId('')
                }}
                className="w-full rounded-lg border px-4 py-2.5"
              >
                <option value="">Chagua njia...</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {routes.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">Hakuna njia — admin alazimike kuongeza njia na nauli.</p>
              )}
            </div>

            {routeId && activeCount > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Utapangiwa gari kiotomatiki kwa njia hii. / A matatu on this route will be assigned to you automatically.
              </div>
            )}

            {routeId && activeCount === 0 && (
              <p className="text-xs text-gray-500">
                Hakuna safari hai kwa njia hii sasa — unaweza kulipa bado, na utapangiwa gari dereva atakapoanza safari.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Kutoka / From</label>
                <select
                  value={fromStage}
                  onChange={(e) => setFromStage(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5"
                  disabled={!routeId}
                >
                  <option value="">Chagua...</option>
                  {fromStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Kwenda / To</label>
                <select
                  value={toStage}
                  onChange={(e) => setToStage(e.target.value)}
                  className="w-full rounded-lg border px-4 py-2.5"
                  disabled={!fromStage}
                >
                  <option value="">Chagua...</option>
                  {toStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {fare !== null && !fare && fromStage && toStage && (
              <p className="text-sm text-red-600">Hakuna nauli kwa hatua hizi — admin aongeze stage fares.</p>
            )}

            {fare && (
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm text-gray-600">Nauli / Fare</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(fare)}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={loading || !canPay}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Inalipa / Paying...' : 'Lipa Sasa / Pay Now'}
            </button>

            {openTrip && (
              <p className="text-center text-sm text-amber-700">
                Huwezi kulipa hadi umalize safari yako ya sasa.
              </p>
            )}

            {!canPay && !openTrip && routeId && (
              <p className="text-center text-xs text-gray-500">Chagua kutoka na kwenda ili kulipa</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-green-600 text-4xl">✓</div>
            <h3 className="text-xl font-bold text-gray-800">Malipo Yamefanikiwa!</h3>
            <p className="text-gray-600">Payment successful — show this to the driver</p>

            <div className="my-6 flex justify-center">
              <QRCodeSVG value={encodePaymentQr(payment.payment_code)} size={180} level="M" />
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Msimbo wa Malipo / Payment Code</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-green-700">
                {payment.payment_code}
              </p>
              <p className="mt-2 text-lg font-semibold">{formatCurrency(payment.amount)}</p>
              {payment.assigned_vehicle && (
                <p className="mt-1 text-sm font-medium text-green-700">
                  Gari lako / Your matatu: <strong>{payment.assigned_vehicle}</strong>
                </p>
              )}
              <p className="text-sm text-gray-500">
                Salio jipya: {formatCurrency(payment.balance)}
              </p>
            </div>

            {payment.driver && (
              <div className="mt-4 text-left">
                <PhoneContact
                  label="Wasiliana na dereva / Call driver"
                  name={payment.driver.full_name}
                  phone={payment.driver.phone}
                />
              </div>
            )}

            <Link
              to="/passenger/complete-trip"
              className="mt-6 inline-block text-green-600 hover:underline"
            >
              Nenda Maliza Safari / Complete trip →
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}
