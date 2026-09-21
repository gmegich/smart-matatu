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
        .select('id, routes(name), vehicles(plate_number)')
        .eq('status', 'active')
        .eq('is_full', true)
        .then(({ data }) => setFullTrips(data || []))
    }

    const load = async () => {
      const [walletResult, paymentsResult] = await Promise.allSettled([
        fetchMyWallet(),
        fetchMyPayments(),
      ])

      if (walletResult.status === 'fulfilled') setWallet(walletResult.value)
      else setWallet(null)

      if (paymentsResult.status === 'fulfilled') {
        const data = paymentsResult.value || []
        setRecentPayments(data.slice(0, 5))
        setTripsToComplete(data.filter(needsAction).length)
      } else {
        setRecentPayments([])
        setTripsToComplete(0)
      }

      loadFullTrips()
    }

    load()

    const channel = supabase
      .channel('passenger-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: 'status=eq.active' },
        loadFullTrips
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchMyPayments()
          .then((data) => {
            setRecentPayments((data || []).slice(0, 5))
            setTripsToComplete((data || []).filter(needsAction).length)
          })
          .catch(() => {})
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <Layout title={`Karibu / Welcome, ${profile?.full_name}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Salio la Mkoba / Wallet"
          value={formatCurrency(wallet?.balance)}
          icon="👛"
          color="green"
        />
        <StatCard
          title="Malipo ya Hivi Karibuni / Recent Payments"
          value={recentPayments.length}
          subtitle="Recent payments"
          icon="💳"
          color="blue"
        />
        <StatCard title="Huduma / Service" value="Nakuru" subtitle="Matatu tracking" icon="🚌" color="red" />
      </div>

      {tripsToComplete > 0 && (
        <div className="alert-warning mt-6">
          <h3 className="font-bold text-amber-900">Maliza Safari / Complete your trip</h3>
          <p className="mt-1 text-sm text-amber-800/90">
            Una safari {tripsToComplete} inahitaji hatua — maliza na toa maoni kabla ya kulipa nyingine.
          </p>
          <Link to="/passenger/complete-trip" className="btn-primary mt-4 inline-flex text-sm">
            Maliza Safari sasa →
          </Link>
        </div>
      )}

      {fullTrips.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
          <h3 className="font-bold text-red-800">Matatu Zimejaa / Cars Full</h3>
          <p className="mt-1 text-sm text-red-700/90">
            Dereva ameweka alama kuwa gari limejaa — usilipe kwa matatu hizi:
          </p>
          <ul className="mt-3 space-y-2">
            {fullTrips.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm">
                <span>
                  <strong>{t.vehicles?.plate_number}</strong> — {t.routes?.name}
                </span>
                <span className="badge bg-red-200 text-red-900">IMEJAA</span>
              </li>
            ))}
          </ul>
          <Link to="/passenger/pay" className="mt-3 inline-block text-sm font-semibold text-red-700 hover:underline">
            Nenda kulipa nauli →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/passenger/pay', label: 'Lipa Nauli / Pay Fare', desc: 'Pay fare before boarding', icon: '💳' },
          { to: '/passenger/complete-trip', label: 'Maliza Safari / Complete', desc: 'Complete trip & give feedback', icon: '💬' },
          { to: '/passenger/track', label: 'Fuatilia Matatu / Track', desc: 'Live GPS on the map', icon: '📍' },
          { to: '/passenger/wallet', label: 'Mkoba / Wallet', desc: 'Top up & transactions', icon: '👛' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card card-hover block p-5">
            <span className="text-3xl">{item.icon}</span>
            <h3 className="mt-3 font-bold text-slate-800">{item.label}</h3>
            <p className="mt-0.5 text-sm text-slate-400">{item.desc}</p>
          </Link>
        ))}
      </div>

      {recentPayments.length > 0 && (
        <div className="card mt-8 p-6">
          <h3 className="mb-4 font-bold text-slate-800">Malipo ya Hivi Karibuni</h3>
          <div className="space-y-1">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-800">{p.routes?.name}</p>
                  <p className="text-xs text-slate-400">Code: {p.payment_code}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                  <span
                    className={`badge ${
                      p.status === 'verified' || p.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
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
