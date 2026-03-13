'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { CustomerResponse } from '../api/customer'

interface CustomerAuthContextType {
  customer: CustomerResponse | null
  accessToken: string | null
  login: (customer: CustomerResponse, accessToken: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Load auth data from localStorage on mount
    const storedCustomer = localStorage.getItem('customer')
    const storedToken = localStorage.getItem('customerAccessToken')

    if (storedCustomer && storedToken) {
      setCustomer(JSON.parse(storedCustomer))
      setAccessToken(storedToken)
    }
  }, [])

  const login = (customer: CustomerResponse, accessToken: string, refreshToken: string) => {
    setCustomer(customer)
    setAccessToken(accessToken)
    localStorage.setItem('customer', JSON.stringify(customer))
    localStorage.setItem('customerAccessToken', accessToken)
    localStorage.setItem('customerRefreshToken', refreshToken)
  }

  const logout = () => {
    setCustomer(null)
    setAccessToken(null)
    localStorage.removeItem('customer')
    localStorage.removeItem('customerAccessToken')
    localStorage.removeItem('customerRefreshToken')
  }

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        accessToken,
        login,
        logout,
        isAuthenticated: !!customer && !!accessToken,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return context
}
