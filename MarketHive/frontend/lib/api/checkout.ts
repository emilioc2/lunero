import api from '../api'

export interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface CheckoutTotals {
  subtotal: string
  shipping: string
  tax: string
  total: string
}

export interface PaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
  amount: number
  totals: CheckoutTotals
}

export const checkoutApi = {
  validateCart: async (cartId: number): Promise<{ message: string; item_count: number }> => {
    const response = await api.post('/v1/checkout/validate', { cart_id: cartId })
    return response.data
  },

  calculateTotals: async (cartId: number, shippingAddress: Partial<ShippingAddress>): Promise<CheckoutTotals> => {
    const response = await api.post('/v1/checkout/calculate', {
      cart_id: cartId,
      shipping_address: shippingAddress
    })
    return response.data
  },

  createPaymentIntent: async (cartId: number, shippingAddress: ShippingAddress): Promise<PaymentIntentResponse> => {
    const response = await api.post('/v1/checkout/payment', {
      cart_id: cartId,
      shipping_address: shippingAddress
    })
    return response.data
  }
}
