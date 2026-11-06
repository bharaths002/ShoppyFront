import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStore.getUser())

  // `data` is the verifyotp / login response: { access, refresh, role, vendor_profile }
  const login = useCallback((data, contact) => {
    tokenStore.setTokens(data.access, data.refresh)
    const next = { contact, role: data.role, vendor_profile: data.vendor_profile }
    tokenStore.setUser(next)
    setUser(next)
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh()
    if (refresh) {
      try {
        await api.post('/api/token/blacklist/', { refresh }, { auth: false })
      } catch {
        // already invalid or network issue: still log out locally
      }
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  // merge fresh data (e.g. vendor status after the profile page reloads it)
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch }
      tokenStore.setUser(next)
      return next
    })
  }, [])

  // api client fires this when a token refresh fails
  useEffect(() => {
    const onForcedLogout = () => setUser(null)
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === 'admin',
      // decide vendor UI from the application status, never from role or is_active
      isVendorApproved: user?.vendor_profile?.status === 'approved',
      login,
      logout,
      updateUser,
    }),
    [user, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}