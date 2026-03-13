'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { storesApi, StoreResponse } from '@/lib/api/stores'
import { Button } from '@/components/shared/Button'

export default function Dashboard() {
  const router = useRouter()
  const { business, accessToken, isAuthenticated, logout } = useAuth()
  const [stores, setStores] = useState<StoreResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/business/login')
      return
    }

    // For now, we'll show a placeholder since we don't have a "list stores" endpoint
    // In a real implementation, you'd fetch stores from the API
    setIsLoading(false)
  }, [isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{business?.business_name}</span>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Stores</h2>
            <Link href="/dashboard/stores/new">
              <Button>+ Create Store</Button>
            </Link>
          </div>

          {!business?.email_verified && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
              Please verify your email address to create stores. Check your inbox for the verification link.
            </div>
          )}

          {stores.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No stores</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first store.
              </p>
              <div className="mt-6">
                <Link href="/dashboard/stores/new">
                  <Button>+ Create Store</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {store.logo_url && (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-16 w-16 object-cover rounded mb-4"
                      />
                    )}
                    <h3 className="text-lg font-medium text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{store.subdomain}.markethive.com</p>
                    <p className="text-sm text-gray-600 mt-2">{store.description}</p>
                    <div className="mt-4">
                      <Link href={`/dashboard/stores/${store.id}`}>
                        <Button variant="secondary" className="w-full">
                          Manage →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
