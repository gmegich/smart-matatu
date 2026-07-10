import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = {
  passenger: [
    { to: '/passenger', label: 'Dashboard', icon: '🏠' },
    { to: '/passenger/routes', label: 'Njia / Routes', icon: '🛣️' },
    { to: '/passenger/pay', label: 'Lipa Nauli / Pay', icon: '💳' },
    { to: '/passenger/track', label: 'Fuatilia Matatu', icon: '📍' },
    { to: '/passenger/complete-trip', label: 'Maliza Safari', icon: '✓' },
    { to: '/passenger/wallet', label: 'Mkoba / Wallet', icon: '👛' },
    { to: '/passenger/history', label: 'Historia', icon: '📋' },
  ],
  driver: [
    { to: '/driver', label: 'Dashboard', icon: '🏠' },
    { to: '/driver/trips', label: 'Safari / Trips', icon: '🚌' },
    { to: '/driver/track', label: 'Ramani Hai / Live Map', icon: '📍' },
    { to: '/driver/verify', label: 'Thibitisha Malipo', icon: '✅' },
    { to: '/driver/routes', label: 'Njia Zangu', icon: '🛣️' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: '🏠' },
    { to: '/admin/live-map', label: 'Ramani Hai / Live Map', icon: '🗺️' },
    { to: '/admin/users', label: 'Watumiaji', icon: '👥' },
    { to: '/admin/vehicles', label: 'Magari', icon: '🚌' },
    { to: '/admin/routes', label: 'Njia & Nauli', icon: '🛣️' },
    { to: '/admin/wallets', label: 'Mikoba', icon: '👛' },
    { to: '/admin/trips', label: 'Safari', icon: '📍' },
    { to: '/admin/feedback', label: 'Maoni', icon: '💬' },
    { to: '/admin/reports', label: 'Ripoti', icon: '📊' },
    { to: '/admin/settings', label: 'Mipangilio', icon: '⚙️' },
  ],
  owner: [
    { to: '/owner', label: 'Dashboard', icon: '🏠' },
    { to: '/owner/vehicles', label: 'Magari Yangu', icon: '🚌' },
    { to: '/owner/earnings', label: 'Mapato', icon: '💰' },
    { to: '/owner/track', label: 'Fuatilia', icon: '📍' },
  ],
}

export default function Layout({ children, title }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const items = navItems[profile?.role] || []

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 w-64 transform bg-gradient-to-b from-green-800 to-green-900 text-white shadow-xl lg:translate-x-0">
        <div className="border-b border-green-700 p-5">
          <h1 className="text-lg font-bold">Smart Matatu</h1>
          <p className="text-xs text-green-200">Nakuru SACCO System</p>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                location.pathname === item.to
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-green-700 p-4">
          <p className="truncate text-sm font-medium">{profile?.full_name}</p>
          <p className="truncate text-xs capitalize text-green-200">{profile?.role}</p>
          {profile?.saccos?.name && (
            <p className="truncate text-xs text-green-300">{profile.saccos.name}</p>
          )}
          <button
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700"
          >
            Toka / Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 border-b bg-white px-4 py-4 shadow-sm lg:px-8">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
