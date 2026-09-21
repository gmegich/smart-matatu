import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = {
  passenger: [
    { to: '/passenger', label: 'Dashibodi / Dashboard', icon: '🏠' },
    { to: '/passenger/routes', label: 'Njia / Routes', icon: '🛣️' },
    { to: '/passenger/pay', label: 'Lipa Nauli / Pay', icon: '💳' },
    { to: '/passenger/track', label: 'Fuatilia Matatu / Track', icon: '📍' },
    { to: '/passenger/complete-trip', label: 'Maliza Safari / Complete', icon: '✓' },
    { to: '/passenger/wallet', label: 'Mkoba / Wallet', icon: '👛' },
    { to: '/passenger/history', label: 'Historia / History', icon: '📋' },
  ],
  driver: [
    { to: '/driver', label: 'Dashibodi / Dashboard', icon: '🏠' },
    { to: '/driver/trips', label: 'Safari / Trips', icon: '🚌' },
    { to: '/driver/track', label: 'Ramani Hai / Live Map', icon: '📍' },
    { to: '/driver/verify', label: 'Thibitisha Malipo / Verify', icon: '✅' },
    { to: '/driver/routes', label: 'Njia Zangu / My Routes', icon: '🛣️' },
  ],
  admin: [
    { to: '/admin', label: 'Dashibodi / Dashboard', icon: '🏠' },
    { to: '/admin/live-map', label: 'Ramani Hai / Live Map', icon: '🗺️' },
    { to: '/admin/users', label: 'Watumiaji / Users', icon: '👥' },
    { to: '/admin/vehicles', label: 'Magari / Vehicles', icon: '🚌' },
    { to: '/admin/routes', label: 'Njia & Nauli / Routes & Fares', icon: '🛣️' },
    { to: '/admin/wallets', label: 'Mikoba / Wallets', icon: '👛' },
    { to: '/admin/trips', label: 'Safari / Trips', icon: '📍' },
    { to: '/admin/feedback', label: 'Maoni / Feedback', icon: '💬' },
    { to: '/admin/reports', label: 'Ripoti / Reports', icon: '📊' },
    { to: '/admin/settings', label: 'Mipangilio / Settings', icon: '⚙️' },
  ],
  owner: [
    { to: '/owner', label: 'Dashibodi / Dashboard', icon: '🏠' },
    { to: '/owner/vehicles', label: 'Magari Yangu / My Vehicles', icon: '🚌' },
    { to: '/owner/earnings', label: 'Mapato / Earnings', icon: '💰' },
    { to: '/owner/track', label: 'Fuatilia / Track', icon: '📍' },
  ],
}

const roleLabels = {
  passenger: 'Abiria / Passenger',
  driver: 'Dereva / Driver',
  admin: 'Msimamizi / Admin',
  owner: 'Mmiliki / Owner',
}

function SidebarContent({ items, location, profile, onNavigate, onSignOut }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg shadow-inner">
            🚌
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Smart Matatu</h1>
            <p className="text-[11px] font-medium text-emerald-200/70">Nakuru SACCO System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-emerald-100/80 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-400" />
              )}
              <span className="text-base">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[0.08] p-3">
          <p className="truncate text-sm font-semibold text-white">{profile?.full_name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="badge bg-amber-400/20 text-amber-200">
              {roleLabels[profile?.role] || profile?.role}
            </span>
          </div>
          {profile?.saccos?.name && (
            <p className="mt-1.5 truncate text-[11px] text-emerald-200/60">{profile.saccos.name}</p>
          )}
        </div>
        <button
          onClick={onSignOut}
          className="mt-3 w-full rounded-xl bg-red-500/90 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Toka / Logout
        </button>
      </div>
    </>
  )
}

export default function Layout({ children, title }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const items = navItems[profile?.role] || []

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen page-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          items={items}
          location={location}
          profile={profile}
          onNavigate={closeSidebar}
          onSignOut={handleSignOut}
        />
      </aside>

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900 lg:text-xl">
                {title}
              </h2>
            </div>
            <span className="badge hidden bg-emerald-100 text-emerald-700 sm:inline-flex">
              {roleLabels[profile?.role] || profile?.role}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  )
}
