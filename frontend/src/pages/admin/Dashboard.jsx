import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import { supabase, formatCurrency } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({})
  const [revenueByRoute, setRevenueByRoute] = useState([])
  const [dailyRevenue, setDailyRevenue] = useState([])

  useEffect(() => {
    const load = async () => {
      const saccoId = profile.sacco_id

      const [
        { count: vehicles },
        { count: drivers },
        { count: activeTrips },
        { data: payments },
      ] = await Promise.all([
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId).eq('role', 'driver'),
        supabase.from('trips').select('*', { count: 'exact', head: true }).eq('sacco_id', saccoId).eq('status', 'active'),
        supabase.from('payments').select('amount, route_id, created_at, routes(name)').eq('sacco_id', saccoId).eq('status', 'verified'),
      ])

      const totalRevenue = (payments || []).reduce((s, p) => s + Number(p.amount), 0)

      setStats({ vehicles, drivers, activeTrips, totalRevenue })

      const byRoute = {}
      ;(payments || []).forEach((p) => {
        const name = p.routes?.name || 'Unknown'
        byRoute[name] = (byRoute[name] || 0) + Number(p.amount)
      })
      setRevenueByRoute(Object.entries(byRoute).map(([name, revenue]) => ({ name, revenue })))

      const byDay = {}
      ;(payments || []).forEach((p) => {
        const day = new Date(p.created_at).toLocaleDateString('en-KE', { weekday: 'short' })
        byDay[day] = (byDay[day] || 0) + Number(p.amount)
      })
      setDailyRevenue(Object.entries(byDay).map(([day, revenue]) => ({ day, revenue })))
    }
    if (profile?.sacco_id) load()
  }, [profile])

  return (
    <Layout title="Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Magari" value={stats.vehicles || 0} icon="🚌" color="green" />
        <StatCard title="Madereva" value={stats.drivers || 0} icon="👤" color="blue" />
        <StatCard title="Safari Hai" value={stats.activeTrips || 0} icon="📍" color="red" />
        <StatCard
          title="Mapato"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="Verified payments"
          icon="💰"
          color="yellow"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Mapato kwa Njia / Revenue by Route</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByRoute}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Mapato kwa Siku / Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}
