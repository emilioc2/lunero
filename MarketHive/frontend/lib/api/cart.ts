import api from '../api'

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  product_image: string | null
  quantity: number
  price_at_addition: string
  subtotal: string
  available_quantity: number
}

export interface Cart {
  cart_id: number
  store_id: number
  items: CartItem[]
  subtotal: string
  item_count: number
}

export interface AddToCartRequest {
  product_id: number
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface MergeCartsRequest {
  session_id: string
}

export const cartApi = {
  getCart: async (storeId: number): Promise<Cart> => {
    const response = await api.get<Cart>(`/v1/stores/${storeId}/cart`)
    return response.data
  },

  addItem: async (storeId: number, data: AddToCartRequest): Promise<{ message: string; cart: Cart }> => {
    const response = await api.post<{ message: string; cart: Cart }>(
      `/v1/stores/${storeId}/cart/items`,
      data
    )
    return response.data
  },

  updateItem: async (cartItemId: number, data: UpdateCartItemRequest): Promise<{ message: string; cart: Cart }> => {
    const response = await api.put<{ message: string; cart: Cart }>(
      `/v1/cart/items/${cartItemId}`,
      data
    )
    return response.data
  },

  removeItem: async (cartItemId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      `/v1/cart/items/${cartItemId}/delete`
    )
    return response.data
  },

  mergeCarts: async (storeId: number, data: MergeCartsRequest): Promise<{ message: string; cart: Cart }> => {
    const response = await api.post<{ message: string; cart: Cart }>(
      `/v1/stores/${storeId}/cart/merge`,
      data
    )
    return response.data
  },
}
