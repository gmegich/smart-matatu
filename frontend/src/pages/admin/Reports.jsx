import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import Layout from '../../components/Layout'
import StatCard from '../../components/StatCard'
import { supabase, formatCurrency } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const COLORS = ['#16a34a', '#dc2626', '#2563eb', '#ca8a04', '#9333ea']

export default function AdminReports() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, routes(name)')
        .eq('sacco_id', profile.sacco_id)
        .order('created_at', { ascending: false })

      const verified = (data || []).filter((p) => p.status === 'verified')
      const pending = (data || []).filter((p) => p.status === 'pending')
      const total = verified.reduce((s, p) => s + Number(p.amount), 0)

      setSummary({
        total,
        verified: verified.length,
        pending: pending.length,
        avg: verified.length ? total / verified.length : 0,
      })
      setPayments(verified)
    }
    if (profile?.sacco_id) load()
  }, [profile])

  const byRoute = {}
  payments.forEach((p) => {
    const name = p.routes?.name || 'Other'
    byRoute[name] = (byRoute[name] || 0) + Number(p.amount)
  })
  const pieData = Object.entries(byRoute).map(([name, value]) => ({ name, value }))

  return (
    <Layout title="Ripoti / Reports">
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <StatCard title="Jumla Mapato / Total Revenue" value={formatCurrency(summary.total)} color="green" />
        <StatCard title="Malipo Yaliyothibitishwa / Verified" value={summary.verified || 0} color="blue" />
        <StatCard title="Inasubiri / Pending" value={summary.pending || 0} color="yellow" />
        <StatCard title="Wastani wa Nauli / Avg Fare" value={formatCurrency(summary.avg)} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Mgawanyo wa Mapato kwa Njia / Revenue by Route</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-white shadow-sm max-h-96 overflow-y-auto">
          <h3 className="border-b p-4 font-semibold">Malipo Yaliyothibitishwa / Verified Payments</h3>
          <div className="divide-y">
            {payments.slice(0, 20).map((p) => (
              <div key={p.id} className="flex justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{p.routes?.name}</p>
                  <p className="text-gray-500">{p.payment_code}</p>
                </div>
                <p className="font-semibold text-green-700">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
