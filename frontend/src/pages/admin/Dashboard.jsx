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
import { formatCurrency } from '../../lib/supabase'
import { fetchAdminAnalytics } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({})
  const [revenueByRoute, setRevenueByRoute] = useState([])
  const [dailyRevenue, setDailyRevenue] = useState([])

  useEffect(() => {
    if (!profile?.sacco_id) return
    let cancelled = false

    fetchAdminAnalytics()
      .then((data) => {
        if (cancelled) return
        setStats({
          vehicles: data.vehicles || 0,
          drivers: data.drivers || 0,
          activeTrips: data.activeTrips || 0,
          totalRevenue: data.totalRevenue || 0,
        })
        setRevenueByRoute(data.revenueByRoute || [])
        setDailyRevenue(data.dailyRevenue || [])
      })
      .catch(() => {
        if (!cancelled) {
          setStats({})
          setRevenueByRoute([])
          setDailyRevenue([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [profile?.sacco_id])

  return (
    <Layout title="Dashibodi ya Admin / Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Magari / Vehicles" value={stats.vehicles || 0} icon="🚌" color="green" />
        <StatCard title="Madereva / Drivers" value={stats.drivers || 0} icon="👤" color="blue" />
        <StatCard title="Safari Hai / Active Trips" value={stats.activeTrips || 0} icon="📍" color="red" />
        <StatCard
          title="Mapato / Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="Verified (last 30 days)"
          icon="💰"
          color="yellow"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 font-bold text-slate-800">Mapato kwa Njia / Revenue by Route</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByRoute}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-bold text-slate-800">Mapato kwa Siku / Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2.5} dot={{ fill: '#dc2626', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}
