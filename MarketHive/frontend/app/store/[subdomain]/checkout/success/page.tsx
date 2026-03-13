'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { storefrontApi, StoreInfo } from '@/lib/api/storefront'

export default function CheckoutSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const subdomain = params.subdomain as string
  const paymentIntentId = searchParams.get('payment_intent')

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStore()
  }, [subdomain])

  const loadStore = async () => {
    try {
      setLoading(true)
      const storeData = await storefrontApi.getStoreBySubdomain(subdomain)
      setStore(storeData)
    } catch (err) {
      console.error('Failed to load store:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      {store && (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
          </div>
        </nav>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>

          <p className="text-lg text-gray-600 mb-2">
            Thank you for your order
          </p>

          {paymentIntentId && (
            <p className="text-sm text-gray-500 mb-8">
              Payment ID: {paymentIntentId}
            </p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8">
            <p className="text-sm text-blue-800">
              A confirmation email has been sent to your email address with order details.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href={`/store/${subdomain}`}
              className="block w-full bg-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue Shopping
            </Link>

            <p className="text-sm text-gray-600">
              You can track your order status in your account
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
