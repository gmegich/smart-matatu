import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SetupRequired from './components/SetupRequired'
import Loading from './components/Loading'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ScanAccess from './pages/auth/ScanAccess'

const PassengerDashboard = lazy(() => import('./pages/passenger/Dashboard'))
const PassengerRoutes = lazy(() => import('./pages/passenger/Routes'))
const PayFare = lazy(() => import('./pages/passenger/PayFare'))
const TrackMatatu = lazy(() => import('./pages/passenger/TrackMatatu'))
const PassengerWallet = lazy(() => import('./pages/passenger/Wallet'))
const TripHistory = lazy(() => import('./pages/passenger/TripHistory'))
const CompleteTrip = lazy(() => import('./pages/passenger/CompleteTrip'))

const DriverDashboard = lazy(() => import('./pages/driver/Dashboard'))
const DriverTrips = lazy(() => import('./pages/driver/Trips'))
const VerifyPayment = lazy(() => import('./pages/driver/VerifyPayment'))
const DriverRoutes = lazy(() => import('./pages/driver/DriverRoutes'))
const DriverTrack = lazy(() => import('./pages/driver/Track'))

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('./pages/admin/Users'))
const AdminVehicles = lazy(() => import('./pages/admin/Vehicles'))
const AdminRoutes = lazy(() => import('./pages/admin/Routes'))
const AdminWallets = lazy(() => import('./pages/admin/Wallets'))
const AdminTrips = lazy(() => import('./pages/admin/Trips'))
const AdminLiveMap = lazy(() => import('./pages/admin/LiveMap'))
const AdminReports = lazy(() => import('./pages/admin/Reports'))
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))

const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'))
const OwnerVehicles = lazy(() => import('./pages/owner/Vehicles'))
const OwnerEarnings = lazy(() => import('./pages/owner/Earnings'))
const OwnerTrack = lazy(() => import('./pages/owner/Track'))

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

function LazyPage({ children }) {
  return <Suspense fallback={<Loading message="Inapakia / Loading..." />}>{children}</Suspense>
}

function guard(roles, Page) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <LazyPage>
        <Page />
      </LazyPage>
    </ProtectedRoute>
  )
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
          <Route path="/scan" element={<ScanAccess />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route path="/passenger" element={guard(['passenger'], PassengerDashboard)} />
          <Route path="/passenger/routes" element={guard(['passenger'], PassengerRoutes)} />
          <Route path="/passenger/pay" element={guard(['passenger'], PayFare)} />
          <Route path="/passenger/track" element={guard(['passenger'], TrackMatatu)} />
          <Route path="/passenger/complete-trip" element={guard(['passenger'], CompleteTrip)} />
          <Route path="/passenger/wallet" element={guard(['passenger'], PassengerWallet)} />
          <Route path="/passenger/history" element={guard(['passenger'], TripHistory)} />

          <Route path="/driver" element={guard(['driver'], DriverDashboard)} />
          <Route path="/driver/trips" element={guard(['driver'], DriverTrips)} />
          <Route path="/driver/verify" element={guard(['driver'], VerifyPayment)} />
          <Route path="/driver/routes" element={guard(['driver'], DriverRoutes)} />
          <Route path="/driver/track" element={guard(['driver'], DriverTrack)} />

          <Route path="/admin" element={guard(['admin'], AdminDashboard)} />
          <Route path="/admin/users" element={guard(['admin'], AdminUsers)} />
          <Route path="/admin/vehicles" element={guard(['admin'], AdminVehicles)} />
          <Route path="/admin/routes" element={guard(['admin'], AdminRoutes)} />
          <Route path="/admin/wallets" element={guard(['admin'], AdminWallets)} />
          <Route path="/admin/trips" element={guard(['admin'], AdminTrips)} />
          <Route path="/admin/live-map" element={guard(['admin'], AdminLiveMap)} />
          <Route path="/admin/reports" element={guard(['admin'], AdminReports)} />
          <Route path="/admin/feedback" element={guard(['admin'], AdminFeedback)} />
          <Route path="/admin/settings" element={guard(['admin'], AdminSettings)} />

          <Route path="/owner" element={guard(['owner'], OwnerDashboard)} />
          <Route path="/owner/vehicles" element={guard(['owner'], OwnerVehicles)} />
          <Route path="/owner/earnings" element={guard(['owner'], OwnerEarnings)} />
          <Route path="/owner/track" element={guard(['owner'], OwnerTrack)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
