import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'
import SetupRequired from './SetupRequired'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <Loading />

  if (!user) return <Navigate to="/login" replace />

  if (!profile) return <SetupRequired />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const home = {
      passenger: '/passenger',
      driver: '/driver',
      admin: '/admin',
      owner: '/owner',
    }
    return <Navigate to={home[profile.role] || '/login'} replace />
  }

  return children
}
