import api from '../api'

export interface CustomerRegistrationData {
  name: string
  email: string
  password: string
  phone?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface CustomerLoginData {
  email: string
  password: string
}

export interface CustomerResponse {
  id: number
  name: string
  email: string
  phone: string | null
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface CustomerAuthResponse {
  customer: CustomerResponse
  access_token: string
  refresh_token: string
}

export interface OrderItem {
  id: number
  product_snapshot: {
    id: number
    name: string
    description: string
    price: string
    category: string
    images: Array<{
      url: string
      thumbnail_url: string
      is_primary: boolean
    }>
  }
  quantity: number
  price: string
  subtotal: string
}

export interface Order {
  id: number
  order_number: string
  status: 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: string
  shipping_cost: string
  tax: string
  total: string
  shipping_address: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    zip: string
    country: string
  }
  created_at: string
  updated_at: string
  store_id: number
  items?: OrderItem[]
}

export interface OrderListResponse {
  orders: Order[]
}

export interface OrderDetailResponse extends Order {
  items: OrderItem[]
}

export const customerApi = {
  register: async (data: CustomerRegistrationData): Promise<CustomerAuthResponse> => {
    const response = await api.post<CustomerAuthResponse>('/v1/customers/register', data)
    return response.data
  },

  login: async (data: CustomerLoginData): Promise<CustomerAuthResponse> => {
    const response = await api.post<CustomerAuthResponse>('/v1/customers/login', data)
    return response.data
  },

  getOrders: async (token: string): Promise<OrderListResponse> => {
    const response = await api.get<OrderListResponse>('/v1/orders', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  },

  getOrderDetail: async (orderId: number, token: string): Promise<OrderDetailResponse> => {
    const response = await api.get<OrderDetailResponse>(`/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  },

  cancelOrder: async (orderId: number, token: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/v1/orders/${orderId}/cancel`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  }
}
