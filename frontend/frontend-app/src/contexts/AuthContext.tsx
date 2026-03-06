import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'quickhouse_user'

export interface User {
  userName: string
  displayName?: string
}

interface AuthContextType {
  user: User | null
  login: (userName: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  isReady: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as User
    return data?.userName ? data : null
  } catch {
    return null
  }
}

function saveUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setUser(loadUser())
    setIsReady(true)
  }, [])

  const login = useCallback((userName: string) => {
    const u: User = { userName }
    setUser(u)
    saveUser(u)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      saveUser(next)
      return next
    })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    saveUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
