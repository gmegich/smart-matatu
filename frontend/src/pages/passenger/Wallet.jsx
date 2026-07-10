import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { formatCurrency, formatDate } from '../../lib/supabase'
import { topupWallet, fetchMyWallet, fetchWalletTransactions, updateProfilePhone, getApiErrorMessage } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import PhoneContact from '../../components/PhoneContact'

export default function PassengerWallet() {
  const { profile, refreshProfile } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [topupAmount, setTopupAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    try {
      const w = await fetchMyWallet()
      setWallet(w)
      if (w?.id) {
        const tx = await fetchWalletTransactions()
        setTransactions(tx)
      }
    } catch {
      setWallet(null)
      setTransactions([])
    }
  }

  useEffect(() => {
    load()
    setPhone(profile?.phone || '')
  }, [profile?.phone])

  const handleSavePhone = async () => {
    if (!phone.trim()) return
    setMessage('')
    try {
      await updateProfilePhone(phone.trim())
      await refreshProfile()
      setMessage('Phone saved — SMS alerts enabled.')
    } catch (err) {
      setMessage(getApiErrorMessage(err))
    }
  }

  const handleSelfTopup = async () => {
    const amount = parseFloat(topupAmount)
    if (!amount || amount <= 0) return
    setMessage('')
    try {
      const data = await topupWallet(amount)
      if (!data?.success) {
        setMessage(data?.error || 'Top-up failed')
        return
      }
      setTopupAmount('')
      setMessage('Top-up successful!')
      load()
    } catch (err) {
      setMessage(getApiErrorMessage(err))
    }
  }

  return (
    <Layout title="Mkoba / Wallet">
      <div className="mb-8 rounded-xl bg-gradient-to-r from-green-600 to-green-700 p-6 text-white shadow-lg">
        <p className="text-sm opacity-80">Salio lako / Your Balance</p>
        <p className="text-4xl font-bold">{formatCurrency(wallet?.balance)}</p>
      </div>

      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold">Nambari ya Simu / Phone (SMS alerts)</h3>
        <div className="flex gap-3">
          <input
            type="tel"
            placeholder="0712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 rounded-lg border px-4 py-2.5"
          />
          <button
            onClick={handleSavePhone}
            className="rounded-lg border border-green-600 px-4 py-2.5 font-semibold text-green-700 hover:bg-green-50"
          >
            Hifadhi
          </button>
        </div>
        {profile?.phone && (
          <div className="mt-3">
            <PhoneContact name={profile.full_name} phone={profile.phone} label="Simu yako" />
          </div>
        )}
      </div>

      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold">Ongeza Salio (Simulated)</h3>
        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            placeholder="Kiasi / Amount (KES)"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className="flex-1 rounded-lg border px-4 py-2.5"
          />
          <button
            onClick={handleSelfTopup}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700"
          >
            Ongeza
          </button>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <h3 className="border-b p-4 font-semibold">Historia ya Miamala</h3>
        <div className="divide-y">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                <p className="text-sm text-gray-500">{tx.description}</p>
                <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    ['topup', 'admin_credit', 'self_topup', 'refund'].includes(tx.type)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {['topup', 'admin_credit', 'self_topup', 'refund'].includes(tx.type) ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </p>
                <p className="text-xs text-gray-400">Bal: {formatCurrency(tx.balance_after)}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="p-6 text-center text-gray-500">No transactions yet</p>
          )}
        </div>
      </div>
    </Layout>
  )
}
