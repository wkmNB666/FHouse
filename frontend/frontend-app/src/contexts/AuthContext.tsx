import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'quickhouse_auth'

export interface User {
  id?: number
  userName: string
  displayName?: string
  realName?: string | null
  contact?: string | null
  role?: string
  permissions?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (payload: { token: string; user: User }) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  isReady: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadAuth(): { token: string; user: User } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { token: string; user: User }
    if (!data?.token || !data?.user?.userName) return null
    return data
  } catch {
    return null
  }
}

function saveAuth(auth: { token: string; user: User } | null) {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const auth = loadAuth()
    setUser(auth?.user ?? null)
    setToken(auth?.token ?? null)
    setIsReady(true)
  }, [])

  const login = useCallback((payload: { token: string; user: User }) => {
    setUser(payload.user)
    setToken(payload.token)
    saveAuth(payload)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      const current = loadAuth()
      if (current?.token) {
        saveAuth({ token: current.token, user: next })
      }
      return next
    })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    saveAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
