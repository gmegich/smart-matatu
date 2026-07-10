import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import { supabase, formatCurrency } from '../../lib/supabase'
import { fetchMyPayments, fetchMyWallet } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function getFeedback(payment) {
  const r = payment?.trip_ratings
  if (!r) return null
  return Array.isArray(r) ? r[0] : r
}

function needsAction(p) {
  const fb = getFeedback(p)
  if (p.status === 'pending' || p.status === 'verified') return true
  if (p.status === 'completed' && !fb) return true
  return false
}

export default function PassengerDashboard() {
  const { profile } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [fullTrips, setFullTrips] = useState([])
  const [tripsToComplete, setTripsToComplete] = useState(0)

  useEffect(() => {
    const loadFullTrips = () => {
      supabase
        .from('trips')
        .select('*, routes(name), vehicles(plate_number)')
        .eq('status', 'active')
        .eq('is_full', true)
        .then(({ data }) => setFullTrips(data || []))
    }

    const loadTripsToComplete = async () => {
      try {
        const data = await fetchMyPayments()
        const count = (data || []).filter(needsAction).length
        setTripsToComplete(count)
      } catch {
        setTripsToComplete(0)
      }
    }

    const load = async () => {
      try {
        const w = await fetchMyWallet()
        setWallet(w)
      } catch {
        setWallet(null)
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*, routes(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentPayments(payments || [])
      loadFullTrips()
      loadTripsToComplete()
    }

    load()

    const channel = supabase
      .channel('passenger-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, loadFullTrips)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadTripsToComplete)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <Layout title={`Karibu, ${profile?.full_name}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Salio la Mkoba / Wallet"
          value={formatCurrency(wallet?.balance)}
          icon="👛"
          color="green"
        />
        <StatCard
          title="Malipo ya Hivi Karibuni"
          value={recentPayments.length}
          subtitle="Recent payments"
          icon="💳"
          color="blue"
        />
        <StatCard title="Huduma" value="Nakuru" subtitle="Matatu tracking" icon="🚌" color="red" />
      </div>

      {tripsToComplete > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h3 className="font-semibold text-amber-900">Maliza Safari / Complete your trip</h3>
          <p className="mt-1 text-sm text-amber-800">
            Una safari {tripsToComplete} inahitaji hatua — maliza na toa maoni kabla ya kulipa nyingine.
          </p>
          <Link
            to="/passenger/complete-trip"
            className="mt-3 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Maliza Safari sasa →
          </Link>
        </div>
      )}

      {fullTrips.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h3 className="font-semibold text-red-800">Matatu Zimejaa / Cars Full</h3>
          <p className="mt-1 text-sm text-red-700">
            Dereva ameweka alama kuwa gari limejaa — usilipe kwa matatu hizi:
          </p>
          <ul className="mt-3 space-y-2">
            {fullTrips.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>
                  <strong>{t.vehicles?.plate_number}</strong> — {t.routes?.name}
                </span>
                <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-900">
                  IMEJAA
                </span>
              </li>
            ))}
          </ul>
          <Link to="/passenger/pay" className="mt-3 inline-block text-sm font-medium text-red-800 underline">
            Nenda kulipa nauli →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/passenger/pay', label: 'Lipa Nauli', desc: 'Pay fare before boarding', icon: '💳' },
          { to: '/passenger/complete-trip', label: 'Maliza Safari', desc: 'Complete trip & give feedback', icon: '💬' },
          { to: '/passenger/track', label: 'Fuatilia Matatu', desc: 'Live GPS on the map', icon: '📍' },
          { to: '/passenger/wallet', label: 'Mkoba', desc: 'Top up & transactions', icon: '👛' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-green-300 hover:shadow-md"
          >
            <span className="text-3xl">{item.icon}</span>
            <h3 className="mt-2 font-semibold text-gray-800">{item.label}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </Link>
        ))}
      </div>

      {recentPayments.length > 0 && (
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-800">Malipo ya Hivi Karibuni</h3>
          <div className="space-y-3">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium">{p.routes?.name}</p>
                  <p className="text-xs text-gray-500">Code: {p.payment_code}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-700">{formatCurrency(p.amount)}</p>
                  <span
                    className={`text-xs capitalize ${
                      p.status === 'verified' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  )
}
