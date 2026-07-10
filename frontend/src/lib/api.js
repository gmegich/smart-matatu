import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'smart_matatu_access_token'
const REFRESH_KEY = 'smart_matatu_refresh_token'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function storeSession(session) {
  if (!session?.access_token) return
  sessionStorage.setItem(TOKEN_KEY, session.access_token)
  if (session.refresh_token) {
    sessionStorage.setItem(REFRESH_KEY, session.refresh_token)
  }
}

export function clearStoredSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  Object.keys(localStorage).forEach((key) => {
    if (key.includes('-auth-token')) localStorage.removeItem(key)
  })
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function applySession(session) {
  if (!session?.access_token) return
  storeSession(session)
  try {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  } catch {
    // Offline or Supabase unreachable — API token in sessionStorage is enough
  }
}

/** Re-attach Supabase auth after page refresh (session lives in sessionStorage). */
export async function restoreSupabaseSession() {
  const access_token = getStoredToken()
  if (!access_token) return false
  const refresh_token = sessionStorage.getItem(REFRESH_KEY) || access_token
  try {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    return !error
  } catch {
    return false
  }
}

export async function registerUser(email, password, full_name, role = 'passenger', phone = '') {
  const { data } = await api.post('/auth/register', { email, password, full_name, role, phone })
  await applySession(data.session)
  return data
}

export async function loginUser(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  await applySession(data.session)
  return data
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(password) {
  const { data } = await api.post('/auth/reset-password', { password })
  return data
}

export async function fetchProfile() {
  const token = getStoredToken()
  if (!token) {
    const err = new Error('Not authenticated')
    err.code = 'NO_SESSION'
    throw err
  }
  const { data } = await api.get('/profile/me')
  return data
}

export async function repairProfile() {
  const token = getStoredToken()
  if (!token) {
    const err = new Error('Not authenticated')
    err.code = 'NO_SESSION'
    throw err
  }
  try {
    const { data } = await api.post('/profile/repair')
    return data.profile
  } catch (err) {
    if (err.response?.status === 404) {
      const { data } = await api.post('/auth/repair-profile')
      return data.profile
    }
    throw err
  }
}

export function isAuthError(err) {
  return err.response?.status === 401 || err.code === 'NO_SESSION'
}

export function getApiErrorMessage(err) {
  if (!err.response) {
    const msg = err.message || ''
    if (
      err.code === 'ERR_NETWORK' ||
      msg.includes('Network Error') ||
      msg.includes('ERR_CONNECTION_REFUSED')
    ) {
      return 'Cannot reach the backend API. Open a terminal and run: cd backend && npm run dev'
    }
    return msg || 'Network error'
  }
  if (err.response?.status === 403) {
    return err.response?.data?.error || 'You do not have permission for this action. Log in as a passenger.'
  }
  const apiError = err.response?.data?.error || err.message
  if (apiError?.toLowerCase().includes('insufficient wallet')) {
    return 'Insufficient wallet balance. Top up your wallet first under Mkoba / Wallet.'
  }
  if (apiError?.toLowerCase().includes('wallet not found')) {
    return 'Wallet not set up. Open Mkoba / Wallet once, then try again.'
  }
  if (apiError?.toLowerCase().includes('arrived_at')) {
    return 'Database needs a small update. Ask your admin to run supabase/add-trip-complete.sql in Supabase SQL Editor, then try again.'
  }
  return apiError
}

export async function createStaffUser(payload) {
  const { data } = await api.post('/admin/users', payload)
  return data
}

export async function fetchOwnerDashboard() {
  const { data } = await api.get('/owner/dashboard')
  return data
}

export async function fetchOwnerEarnings() {
  const { data } = await api.get('/owner/earnings')
  return data
}

export async function assignDriver(payload) {
  const { data } = await api.post('/admin/assignments', payload)
  return data
}

export async function updateAdminUser(id, payload) {
  const { data } = await api.patch(`/admin/users/${id}`, payload)
  return data
}

export async function deleteAdminUser(id) {
  const { data } = await api.delete(`/admin/users/${id}`)
  return data
}

export async function createAdminVehicle(payload) {
  const { data } = await api.post('/admin/vehicles', payload)
  return data
}

export async function fetchOwnerVehicles(ownerId) {
  const { data } = await api.get(`/admin/owner-vehicles/${ownerId}`)
  return data || []
}

export async function updateAdminVehicle(id, payload) {
  const { data } = await api.patch(`/admin/vehicles/${id}`, payload)
  return data
}

export async function deactivateAdminVehicle(id) {
  const { data } = await api.delete(`/admin/vehicles/${id}`)
  return data
}

export async function updateAdminAssignment(id, payload) {
  const { data } = await api.patch(`/admin/assignments/${id}`, payload)
  return data
}

export async function unassignDriver(id) {
  const { data } = await api.delete(`/admin/assignments/${id}`)
  return data
}

export async function updateRoute(id, payload) {
  const { data } = await api.patch(`/routes/${id}`, payload)
  return data
}

export async function deactivateRoute(id) {
  const { data } = await api.delete(`/routes/${id}`)
  return data
}

export async function updateRouteStage(stageId, payload) {
  const { data } = await api.patch(`/routes/stages/${stageId}`, payload)
  return data
}

export async function deleteRouteStage(stageId) {
  const { data } = await api.delete(`/routes/stages/${stageId}`)
  return data
}

export async function updateRouteFare(fareId, payload) {
  const { data } = await api.patch(`/routes/fares/${fareId}`, payload)
  return data
}

export async function deleteRouteFare(fareId) {
  const { data } = await api.delete(`/routes/fares/${fareId}`)
  return data
}

export async function adminDebitWallet(user_id, amount) {
  const { data } = await api.post('/wallets/admin/debit', { user_id, amount })
  return data
}

export async function updatePassengerProfile(id, payload) {
  const { data } = await api.patch(`/wallets/admin/passengers/${id}`, payload)
  return data
}

export async function fetchAdminSettings() {
  const { data } = await api.get('/admin/settings')
  return data
}

export async function updateAdminSettings(payload) {
  const { data } = await api.patch('/admin/settings', payload)
  return data
}

export async function adminEndTrip(tripId) {
  const { data } = await api.post(`/admin/trips/${tripId}/end`)
  return data
}

export async function fetchAdminDrivers() {
  const { data } = await api.get('/admin/drivers')
  return data || []
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments', payload)
  return data
}

export async function topupWallet(amount) {
  const { data } = await api.post('/wallets/topup', { amount })
  return data
}

export async function fetchMyWallet() {
  const { data } = await api.get('/wallets/me')
  return data
}

export async function fetchWalletTransactions() {
  const { data } = await api.get('/wallets/transactions')
  return data || []
}

export async function fetchPassengerWallets() {
  const { data } = await api.get('/wallets/admin/passengers')
  return data
}

export async function adminCreditWallet(user_id, amount) {
  const { data } = await api.post('/wallets/admin/credit', { user_id, amount })
  return data
}

export async function fetchDriverCollections() {
  const { data } = await api.get('/driver/collections')
  return data
}

export async function setTripFull(is_full) {
  const { data } = await api.patch('/driver/trip/full', { is_full })
  return data
}

export async function verifyPayment(payment_code) {
  const { data } = await api.post('/payments/verify', { payment_code })
  return data
}

export async function fetchPaymentContact(paymentId) {
  const { data } = await api.get(`/payments/${paymentId}/contact`)
  return data
}

export async function checkEtaSms(payment_id) {
  const { data } = await api.post('/notifications/eta-check', { payment_id })
  return data
}

export async function fetchTripPassengers() {
  const { data } = await api.get('/driver/trip/passengers')
  return data
}

export async function updateProfilePhone(phone) {
  const { data } = await api.patch('/profile/phone', { phone })
  return data.profile
}

export async function passengerArrive(paymentId) {
  const { data } = await api.post(`/payments/${paymentId}/arrive`)
  return data
}

export async function submitTripFeedback(paymentId, rating, feedback = '') {
  const { data } = await api.post(`/payments/${paymentId}/feedback`, { rating, feedback })
  return data
}

export async function fetchAdminFeedback() {
  const { data } = await api.get('/admin/feedback')
  return data
}

export async function fetchOpenTrip() {
  const { data } = await api.get('/payments/open-trip')
  return data?.openTrip || null
}

export async function fetchMyPayments() {
  const { data } = await api.get('/payments/my-trips')
  return data || []
}

export async function fetchPaymentJourney(paymentId) {
  const { data } = await api.get(`/payments/${paymentId}/journey`)
  return data
}

export default api
