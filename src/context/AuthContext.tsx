'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@/types'
import { validateCredentials, saveSession, loadSession, clearSession } from '@/lib/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (id: string, pw: string) => User | null
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => null,
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(loadSession())
    setLoading(false)
  }, [])

  function login(id: string, pw: string): User | null {
    const u = validateCredentials(id, pw)
    if (u) { saveSession(u); setUser(u) }
    return u
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
