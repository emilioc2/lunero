'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Elements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe'
import { useCart } from '@/lib/context/CartContext'
import { useCustomerAuth } from '@/lib/context/CustomerAuthContext'
import { storefrontApi, StoreInfo } from '@/lib/api/storefront'
import { checkoutApi, ShippingAddress, CheckoutTotals } from '@/lib/api/checkout'
import CheckoutForm from './CheckoutForm'

type CheckoutStep = 'address' | 'review' | 'payment'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const subdomain = params.subdomain as string
  const { cart, refreshCart } = useCart()
  const { isAuthenticated } = useCustomerAuth()

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [storeLoading, setStoreLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address')
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  })
  
  const [totals, setTotals] = useState<CheckoutTotals | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    loadStore()
  }, [subdomain])

  useEffect(() => {
    if (store) {
      refreshCart(store.id)
    }
  }, [store])

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/store/${subdomain}/login?redirect=/store/${subdomain}/checkout`)
    }
  }, [isAuthenticated, subdomain, router])

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

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate address fields
    if (!shippingAddress.name || !shippingAddress.line1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.zip) {
      alert('Please fill in all required address fields')
      return
    }

    try {
      setCalculating(true)
      
      // Calculate totals with shipping address
      const calculatedTotals = await checkoutApi.calculateTotals(cart!.cart_id, {
        country: shippingAddress.country,
        state: shippingAddress.state,
        zip: shippingAddress.zip
      })
      
      setTotals(calculatedTotals)
      setCurrentStep('review')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to calculate totals')
    } finally {
      setCalculating(false)
    }
  }

  const handleProceedToPayment = async () => {
    try {
      setValidating(true)
      
      // Validate cart
      await checkoutApi.validateCart(cart!.cart_id)
      
      // Create payment intent
      const paymentIntent = await checkoutApi.createPaymentIntent(cart!.cart_id, shippingAddress)
      
      setClientSecret(paymentIntent.client_secret)
      setTotals(paymentIntent.totals)
      setCurrentStep('payment')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to initialize payment'
      const details = err.response?.data?.error?.details
      
      if (details?.unavailable_items) {
        alert(`Some items are no longer available:\n${details.unavailable_items.map((item: any) => 
          `- ${item.product_name || 'Product'}: ${item.reason}`
        ).join('\n')}`)
      } else {
        alert(errorMessage)
      }
    } finally {
      setValidating(false)
    }
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

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cart is Empty</h1>
          <p className="text-gray-600 mb-6">Add some items to your cart before checking out</p>
          <Link
            href={`/store/${subdomain}`}
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/store/${subdomain}/cart`}
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
              Back to Cart
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {/* Step 1: Address */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 'address' ? 'bg-indigo-600 text-white' : 
                  currentStep === 'review' || currentStep === 'payment' ? 'bg-green-500 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep === 'review' || currentStep === 'payment' ? '✓' : '1'}
                </div>
                <span className="ml-2 font-medium text-gray-700">Address</span>
              </div>

              <div className="w-16 h-1 bg-gray-300"></div>

              {/* Step 2: Review */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 'review' ? 'bg-indigo-600 text-white' : 
                  currentStep === 'payment' ? 'bg-green-500 text-white' : 
                  'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep === 'payment' ? '✓' : '2'}
                </div>
                <span className="ml-2 font-medium text-gray-700">Review</span>
              </div>

              <div className="w-16 h-1 bg-gray-300"></div>

              {/* Step 3: Payment */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 'payment' ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium text-gray-700">Payment</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {currentStep === 'address' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Address</h2>
                <form onSubmit={handleAddressSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.line1}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.line2}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.zip}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country *
                        </label>
                        <select
                          required
                          value={shippingAddress.country}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={calculating}
                    className="w-full mt-6 bg-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {calculating ? 'Calculating...' : 'Continue to Review'}
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Review */}
            {currentStep === 'review' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Order</h2>

                {/* Shipping Address */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                    <button
                      onClick={() => setCurrentStep('address')}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-gray-600">
                    <p>{shippingAddress.name}</p>
                    <p>{shippingAddress.line1}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}</p>
                    <p>{shippingAddress.country}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${parseFloat(item.subtotal).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={validating}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating ? 'Validating...' : 'Proceed to Payment'}
                </button>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 'payment' && clientSecret && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment</h2>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    clientSecret={clientSecret}
                    subdomain={subdomain}
                    storeId={store.id}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${parseFloat(cart.subtotal).toFixed(2)}</span>
                </div>
                
                {totals ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span>${parseFloat(totals.shipping).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span>${parseFloat(totals.tax).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span className="text-sm">TBD</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span className="text-sm">TBD</span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>
                    {totals ? `$${parseFloat(totals.total).toFixed(2)}` : `$${parseFloat(cart.subtotal).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
