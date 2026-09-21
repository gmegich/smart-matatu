import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  registerUser,
  loginUser,
  fetchProfile as fetchProfileApi,
  repairProfile,
  isAuthError,
  getApiErrorMessage,
  getStoredToken,
  clearStoredSession,
  storeSession,
  restoreSupabaseSession,
} from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initDone = useRef(false)

  const clearAuth = useCallback(() => {
    clearStoredSession()
    try {
      supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore
    }
    setUser(null)
    setProfile(null)
  }, [])

  const fetchProfile = useCallback(async () => {
    if (!getStoredToken()) {
      setProfile(null)
      return null
    }
    try {
      const data = await fetchProfileApi()
      if (data.user) setUser(data.user)
      if (data.profile) setProfile(data.profile)
      return data.profile
    } catch (err) {
      if (isAuthError(err)) {
        clearAuth()
        return null
      }
      try {
        const data = await repairProfile()
        setProfile(data)
        return data
      } catch (repairErr) {
        if (isAuthError(repairErr)) clearAuth()
        setProfile(null)
        return null
      }
    }
  }, [clearAuth])

  const repairUserProfile = useCallback(async () => {
    const data = await repairProfile()
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    const init = async () => {
      const token = getStoredToken()

      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            storeSession(session)
            setUser(session.user)
          } else {
            setLoading(false)
            return
          }
        } catch {
          setLoading(false)
          return
        }
      } else {
        await restoreSupabaseSession()
      }

      await fetchProfile()
      setLoading(false)
    }

    init()
  }, [fetchProfile])

  const signUp = useCallback(async (email, password, fullName, role = 'passenger', phone = '') => {
    try {
      const data = await registerUser(email, password, fullName, role, phone)
      const u = data.session?.user || data.user
      if (u) setUser(u)
      if (data.profile) setProfile(data.profile)
      else await fetchProfile()
      return { data, error: null }
    } catch (err) {
      const message = getApiErrorMessage(err)
      return { data: null, error: { message } }
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email, password) => {
    try {
      const data = await loginUser(email, password)
      setUser(data.user)
      setProfile(data.profile)
      return { data, error: null }
    } catch (err) {
      const message = getApiErrorMessage(err)
      return { data: null, error: { message } }
    }
  }, [])

  const signOut = useCallback(async () => {
    clearAuth()
  }, [clearAuth])

  const refreshProfile = useCallback(() => fetchProfile(), [fetchProfile])

  const value = useMemo(
    () => ({ user, profile, loading, signUp, signIn, signOut, refreshProfile, repairUserProfile }),
    [user, profile, loading, signUp, signIn, signOut, refreshProfile, repairUserProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
