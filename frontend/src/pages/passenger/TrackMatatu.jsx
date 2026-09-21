import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import MapView, { LiveMapBadge } from '../../components/MapView'
import PhoneContact from '../../components/PhoneContact'
import { useLiveVehicleLocations } from '../../hooks/useLiveVehicleLocations'
import { supabase } from '../../lib/supabase'
import { fetchMyPayments, fetchPaymentContact, checkEtaSms, getApiErrorMessage } from '../../lib/api'

export default function TrackMatatu() {
  const [payments, setPayments] = useState([])
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [stages, setStages] = useState([])
  const [contact, setContact] = useState(null)
  const [etaInfo, setEtaInfo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  const vehicleId = selectedPayment?.vehicle_id || null
  const isActiveRide =
    selectedPayment &&
    ['pending', 'verified'].includes(selectedPayment.status) &&
    !selectedPayment.arrived_at

  const { locations, loading, lastSync } = useLiveVehicleLocations({
    vehicleId: isActiveRide && vehicleId ? vehicleId : null,
  })

  const loadPayments = async () => {
    setLoadError('')
    try {
      const data = await fetchMyPayments()
      const active = (data || []).filter(
        (p) =>
          !['expired', 'cancelled', 'completed'].includes(p.status) && !p.arrived_at
      )
      setPayments(active)
      if (active.length === 1) setSelectedPayment(active[0])
      return active
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

  useEffect(() => {
    if (!selectedPayment?.route_id) return
    supabase
      .from('route_stages')
      .select('*')
      .eq('route_id', selectedPayment.route_id)
      .order('order_index')
      .then(({ data }) => setStages(data || []))
  }, [selectedPayment])

  useEffect(() => {
    if (!selectedPayment?.id) {
      setContact(null)
      return
    }
    fetchPaymentContact(selectedPayment.id)
      .then(setContact)
      .catch(() => setContact(null))
  }, [selectedPayment?.id])

  useEffect(() => {
    if (!selectedPayment?.id || !vehicleId || selectedPayment.status !== 'verified') return

    const runCheck = () => {
      checkEtaSms(selectedPayment.id)
        .then(setEtaInfo)
        .catch(() => {})
    }

    runCheck()
    const interval = setInterval(runCheck, 30000)
    return () => clearInterval(interval)
  }, [selectedPayment?.id, vehicleId, selectedPayment?.status])

  const location = locations[0]

  return (
    <Layout title="Fuatilia Matatu / Track Matatu">
      <p className="mb-4 text-sm text-gray-600">
        Fuatilia eneo la matatu moja kwa moja. Ukifika,{' '}
        <Link to="/passenger/complete-trip" className="font-medium text-green-700 underline">
          maliza safari hapa
        </Link>
        .
      </p>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loadError}
          <span className="block mt-1 text-xs">
            Hakikisha backend inaendesha: cd backend && npm run dev
          </span>
        </div>
      )}

      {pageLoading && <p className="mb-4 text-sm text-gray-500">Inapakia safari...</p>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {payments.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPayment(p)}
            className={`rounded-xl border p-4 text-left transition ${
              selectedPayment?.id === p.id
                ? 'border-green-500 bg-green-50'
                : 'bg-white hover:border-green-300'
            }`}
          >
            <p className="font-semibold">{p.routes?.name || 'Route'}</p>
            <p className="text-sm text-gray-500">{p.vehicles?.plate_number || 'Matatu'}</p>
            <p className="text-xs text-gray-400">
              {p.from_stage?.name} → {p.to_stage?.name} · {p.payment_code}
            </p>
            <p className="mt-1 text-xs capitalize text-amber-700">{p.status}</p>
          </button>
        ))}
        {!pageLoading && payments.length === 0 && (
          <div className="col-span-full rounded-xl border bg-white p-6 text-sm text-gray-600">
            <p>Hakuna safari hai ya kufuatilia.</p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-gray-500">
              <li>
                <Link to="/passenger/pay" className="text-green-700 underline">
                  Lipa nauli
                </Link>{' '}
                kwanza
              </li>
              <li>Dereva athibitishe msimbo wako wa malipo</li>
              <li>
                Angalia{' '}
                <Link to="/passenger/complete-trip" className="text-green-700 underline">
                  Maliza Safari
                </Link>{' '}
                kwa safari zote
              </li>
            </ul>
          </div>
        )}
      </div>

      {selectedPayment && (
        <>
          {contact?.driver && (
            <div className="mb-4">
              <PhoneContact
                label="Dereva / Driver"
                name={contact.driver.full_name}
                phone={contact.driver.phone}
              />
            </div>
          )}

          {selectedPayment.status === 'pending' && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Msimbo wako:</strong>{' '}
              <span className="font-mono text-lg">{selectedPayment.payment_code}</span>
              <p className="mt-1">Onyesha dereva ili athibitishe. Baadaye utaona GPS hapa.</p>
            </div>
          )}

          {!selectedPayment.vehicle_id && selectedPayment.status === 'verified' && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Malipo yamethibitishwa lakini hakuna gari iliyounganishwa — ramani inaweza kuwa haipatikani.
            </div>
          )}

          {selectedPayment.status === 'verified' && etaInfo?.eta_minutes != null && (
            <div
              className={`mb-4 rounded-lg border p-4 text-sm ${
                etaInfo.eta_minutes <= 2
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <p>
                <strong>ETA:</strong> ~{etaInfo.eta_minutes} min to{' '}
                {etaInfo.pickup_stage || selectedPayment.to_stage?.name}
              </p>
              {etaInfo.sms_sent && (
                <p className="mt-1 text-green-700">SMS imetumwa — matatu iko karibu!</p>
              )}
            </div>
          )}

          {selectedPayment.vehicle_id ? (
            <>
              <LiveMapBadge lastSync={lastSync} count={location ? 1 : 0} />
              {loading && !location ? (
                <p className="mb-3 text-gray-500">Inapakia eneo la matatu...</p>
              ) : location ? (
                <MapView
                  vehicles={locations.map((l) => ({
                    ...l,
                    label: selectedPayment.vehicles?.plate_number || l.label,
                    route_name: selectedPayment.routes?.name,
                  }))}
                  stages={stages}
                  autoFit
                />
              ) : (
                <>
                  <MapView stages={stages} />
                  <p className="mt-3 text-sm text-gray-500">
                    GPS bado haipatikani — dereva lazima aanze safari na ruhusu eneo kwenye kivinjari.
                  </p>
                </>
              )}
            </>
          ) : (
            <MapView stages={stages} />
          )}

          <Link
            to="/passenger/complete-trip"
            className="mt-6 block rounded-xl border-2 border-green-600 bg-green-50 p-5 text-center font-semibold text-green-800 hover:bg-green-100"
          >
            Umefika? Maliza safari →
          </Link>
        </>
      )}
    </Layout>
  )
}
