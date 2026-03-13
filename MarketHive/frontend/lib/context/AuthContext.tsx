'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessResponse } from '../api/business'

interface AuthContextType {
  business: BusinessResponse | null
  accessToken: string | null
  login: (business: BusinessResponse, accessToken: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<BusinessResponse | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Load auth data from localStorage on mount
    const storedBusiness = localStorage.getItem('business')
    const storedToken = localStorage.getItem('accessToken')

    if (storedBusiness && storedToken) {
      setBusiness(JSON.parse(storedBusiness))
      setAccessToken(storedToken)
    }
  }, [])

  const login = (business: BusinessResponse, accessToken: string, refreshToken: string) => {
    setBusiness(business)
    setAccessToken(accessToken)
    localStorage.setItem('business', JSON.stringify(business))
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  const logout = () => {
    setBusiness(null)
    setAccessToken(null)
    localStorage.removeItem('business')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  return (
    <AuthContext.Provider
      value={{
        business,
        accessToken,
        login,
        logout,
        isAuthenticated: !!business && !!accessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
