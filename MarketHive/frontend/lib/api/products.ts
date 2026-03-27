import api from '../api'

export interface ProductCreationData {
  name: string
  description: string
  price: string
  quantity: number
  category: string
  weight_grams?: number
}

export interface ProductUpdateData {
  name?: string
  description?: string
  price?: string
  quantity?: number
  category?: string
  weight_grams?: number
}

export interface ProductResponse {
  id: number
  store_id: number
  name: string
  description: string
  price: string
  quantity: number
  category: string
  weight_grams: number
  created_at: string
  updated_at: string
  images: Array<{
    id: number
    url: string
    thumbnail_url: string
    is_primary: boolean
  }>
}

export const productsApi = {
  create: async (storeId: number, data: ProductCreationData, token: string) => {
    // Backend route: POST /api/v1/stores/:storeId/products/create
    const response = await api.post<ProductResponse>(
      `/v1/stores/${storeId}/products/create`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  update: async (productId: number, data: ProductUpdateData, token: string) => {
    // Backend route: PUT /api/v1/products/:productId/update
    const response = await api.put<ProductResponse>(
      `/v1/products/${productId}/update`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  delete: async (productId: number, token: string) => {
    // Backend route: DELETE /api/v1/products/:productId/delete
    const response = await api.delete(`/v1/products/${productId}/delete`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  getByStore: async (storeId: number, page = 1, pageSize = 24, token?: string) => {
    // Backend route: GET /api/v1/stores/:storeId/products
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await api.get(
      `/v1/stores/${storeId}/products`,
      { headers, params: { page, page_size: pageSize } }
    )
    return response.data
  },

  uploadImages: async (productId: number, files: File[], token: string) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })

    const response = await api.post(`/v1/products/${productId}/images`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
