import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SetupRequired from './components/SetupRequired'
import Loading from './components/Loading'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

import PassengerDashboard from './pages/passenger/Dashboard'
import PassengerRoutes from './pages/passenger/Routes'
import PayFare from './pages/passenger/PayFare'
import TrackMatatu from './pages/passenger/TrackMatatu'
import PassengerWallet from './pages/passenger/Wallet'
import TripHistory from './pages/passenger/TripHistory'
import CompleteTrip from './pages/passenger/CompleteTrip'

import DriverDashboard from './pages/driver/Dashboard'
import DriverTrips from './pages/driver/Trips'
import VerifyPayment from './pages/driver/VerifyPayment'
import DriverRoutes from './pages/driver/DriverRoutes'
import DriverTrack from './pages/driver/Track'

import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminVehicles from './pages/admin/Vehicles'
import AdminRoutes from './pages/admin/Routes'
import AdminWallets from './pages/admin/Wallets'
import AdminTrips from './pages/admin/Trips'
import AdminLiveMap from './pages/admin/LiveMap'
import AdminReports from './pages/admin/Reports'
import AdminFeedback from './pages/admin/Feedback'
import AdminSettings from './pages/admin/Settings'

import OwnerDashboard from './pages/owner/Dashboard'
import OwnerVehicles from './pages/owner/Vehicles'
import OwnerEarnings from './pages/owner/Earnings'
import OwnerTrack from './pages/owner/Track'

function RoleRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <SetupRequired />
  const routes = {
    passenger: '/passenger',
    driver: '/driver',
    admin: '/admin',
    owner: '/owner',
  }
  return <Navigate to={routes[profile?.role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route path="/passenger" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerDashboard /></ProtectedRoute>} />
          <Route path="/passenger/routes" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerRoutes /></ProtectedRoute>} />
          <Route path="/passenger/pay" element={<ProtectedRoute allowedRoles={['passenger']}><PayFare /></ProtectedRoute>} />
          <Route path="/passenger/track" element={<ProtectedRoute allowedRoles={['passenger']}><TrackMatatu /></ProtectedRoute>} />
          <Route path="/passenger/complete-trip" element={<ProtectedRoute allowedRoles={['passenger']}><CompleteTrip /></ProtectedRoute>} />
          <Route path="/passenger/wallet" element={<ProtectedRoute allowedRoles={['passenger']}><PassengerWallet /></ProtectedRoute>} />
          <Route path="/passenger/history" element={<ProtectedRoute allowedRoles={['passenger']}><TripHistory /></ProtectedRoute>} />

          <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
          <Route path="/driver/trips" element={<ProtectedRoute allowedRoles={['driver']}><DriverTrips /></ProtectedRoute>} />
          <Route path="/driver/verify" element={<ProtectedRoute allowedRoles={['driver']}><VerifyPayment /></ProtectedRoute>} />
          <Route path="/driver/routes" element={<ProtectedRoute allowedRoles={['driver']}><DriverRoutes /></ProtectedRoute>} />
          <Route path="/driver/track" element={<ProtectedRoute allowedRoles={['driver']}><DriverTrack /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/vehicles" element={<ProtectedRoute allowedRoles={['admin']}><AdminVehicles /></ProtectedRoute>} />
          <Route path="/admin/routes" element={<ProtectedRoute allowedRoles={['admin']}><AdminRoutes /></ProtectedRoute>} />
          <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['admin']}><AdminWallets /></ProtectedRoute>} />
          <Route path="/admin/trips" element={<ProtectedRoute allowedRoles={['admin']}><AdminTrips /></ProtectedRoute>} />
          <Route path="/admin/live-map" element={<ProtectedRoute allowedRoles={['admin']}><AdminLiveMap /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute allowedRoles={['admin']}><AdminFeedback /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />

          <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/vehicles" element={<ProtectedRoute allowedRoles={['owner']}><OwnerVehicles /></ProtectedRoute>} />
          <Route path="/owner/earnings" element={<ProtectedRoute allowedRoles={['owner']}><OwnerEarnings /></ProtectedRoute>} />
          <Route path="/owner/track" element={<ProtectedRoute allowedRoles={['owner']}><OwnerTrack /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
