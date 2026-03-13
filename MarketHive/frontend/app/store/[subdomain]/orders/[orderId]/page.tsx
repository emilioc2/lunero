'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { customerApi, OrderDetailResponse } from '@/lib/api/customer'
import { useCustomerAuth } from '@/lib/context/CustomerAuthContext'
import { Button } from '@/components/shared/Button'

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const subdomain = params.subdomain as string
  const orderId = parseInt(params.orderId as string)
  const { isAuthenticated, accessToken } = useCustomerAuth()

  const [order, setOrder] = useState<OrderDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/store/${subdomain}/login?redirect=/store/${subdomain}/orders/${orderId}`)
      return
    }

    loadOrderDetail()
  }, [isAuthenticated, accessToken, orderId])

  const loadOrderDetail = async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      const response = await customerApi.getOrderDetail(orderId, accessToken)
      setOrder(response)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!accessToken || !order) return

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return
    }

    try {
      setCancelling(true)
      await customerApi.cancelOrder(orderId, accessToken)
      setCancelSuccess(true)
      // Reload order to show updated status
      await loadOrderDetail()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  const canCancelOrder = () => {
    return order && (order.status === 'paid' || order.status === 'processing')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading order details...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <Link
            href={`/store/${subdomain}/orders`}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/store/${subdomain}/orders`}
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Orders
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.order_number}
              </h1>
              <p className="mt-2 text-gray-600">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {cancelSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            Order cancelled successfully. A refund has been initiated.
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Order Items */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  {item.product_snapshot.images?.[0] && (
                    <img
                      src={item.product_snapshot.images[0].thumbnail_url}
                      alt={item.product_snapshot.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {item.product_snapshot.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-sm text-gray-600">
                      Price: ${item.price}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${item.subtotal}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>${order.shipping_cost}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${order.tax}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>${order.total}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <div className="text-gray-600">
              <p>{order.shipping_address.name}</p>
              <p>{order.shipping_address.line1}</p>
              {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
              </p>
              <p>{order.shipping_address.country}</p>
            </div>
          </div>

          {/* Cancel Order Button */}
          {canCancelOrder() && (
            <div className="p-6 bg-gray-50 border-t">
              <Button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
              <p className="mt-2 text-sm text-gray-600">
                You can cancel this order and receive a full refund.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
