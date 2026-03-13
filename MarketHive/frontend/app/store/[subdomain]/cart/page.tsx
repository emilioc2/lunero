'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/context/CartContext'
import { storefrontApi, StoreInfo } from '@/lib/api/storefront'

export default function CartPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain as string
  const { cart, loading, updateQuantity, removeItem, refreshCart } = useCart()

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [storeLoading, setStoreLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStore()
  }, [subdomain])

  useEffect(() => {
    if (store) {
      refreshCart(store.id)
    }
  }, [store])

  const loadStore = async () => {
    try {
      setStoreLoading(true)
      const storeData = await storefrontApi.getStoreBySubdomain(subdomain)
      setStore(storeData)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load store')
    } finally {
      setStoreLoading(false)
    }
  }

  const handleUpdateQuantity = async (cartItemId: number, newQuantity: number) => {
    try {
      await updateQuantity(cartItemId, newQuantity)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update quantity')
    }
  }

  const handleRemoveItem = async (cartItemId: number) => {
    if (confirm('Remove this item from your cart?')) {
      try {
        await removeItem(cartItemId)
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Failed to remove item')
      }
    }
  }

  const handleCheckout = () => {
    // Check if user is authenticated
    const token = localStorage.getItem('customer_token')
    if (!token) {
      alert('Please log in to proceed with checkout')
      return
    }
    
    // Navigate to checkout
    router.push(`/store/${subdomain}/checkout`)
  }

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600">{error || 'The store you are looking for does not exist.'}</p>
        </div>
      </div>
    )
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/store/${subdomain}`}
              className="text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Store
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {isEmpty ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="w-24 h-24 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to get started</p>
            <Link
              href={`/store/${subdomain}`}
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                {cart.items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 p-6 border-b border-gray-200 last:border-b-0"
                    >
                      {/* Product Image */}
                      <Link
                        href={`/store/${subdomain}/product/${item.product_id}`}
                        className="flex-shrink-0"
                      >
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/store/${subdomain}/product/${item.product_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {item.product_name}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          ${parseFloat(item.price_at_addition).toFixed(2)} each
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              disabled={loading || item.quantity <= 1}
                              className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={loading || item.quantity >= item.available_quantity}
                              className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={loading}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        {item.quantity >= item.available_quantity && (
                          <p className="text-sm text-amber-600 mt-2">
                            Maximum quantity available
                          </p>
                        )}
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          ${parseFloat(item.subtotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Items ({cart.item_count})</span>
                    <span>${parseFloat(cart.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-sm">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span className="text-sm">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Subtotal</span>
                    <span>${parseFloat(cart.subtotal).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Proceed to Checkout
                </button>

                <Link
                  href={`/store/${subdomain}`}
                  className="block text-center text-indigo-600 hover:text-indigo-700 mt-4"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
