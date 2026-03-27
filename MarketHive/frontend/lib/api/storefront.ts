import api from '../api'

export interface ProductImage {
  id: number
  url: string
  thumbnail_url: string
  medium_url: string
  is_primary: boolean
  display_order: number
}

export interface Product {
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
  images: ProductImage[]
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface StoreInfo {
  id: number
  business_id: number
  name: string
  subdomain: string
  description: string
  logo_url: string | null
  color_scheme: {
    primary?: string
    secondary?: string
    accent?: string
  }
  theme: string
  created_at: string
  updated_at: string
}

export const storefrontApi = {
  getStoreBySubdomain: async (subdomain: string): Promise<StoreInfo> => {
    // Backend route: GET /api/v1/stores/by-subdomain/:subdomain
    const response = await api.get<StoreInfo>(`/v1/stores/by-subdomain/${subdomain}`)
    return response.data
  },

  getProducts: async (
    storeId: number,
    page: number = 1,
    pageSize: number = 24,
    category?: string
  ): Promise<ProductListResponse> => {
    const params: any = { page, page_size: pageSize }
    if (category) {
      params.category = category
    }
    const response = await api.get<ProductListResponse>(
      `/v1/stores/${storeId}/products`,
      { params }
    )
    return response.data
  },

  getProductById: async (productId: number): Promise<Product> => {
    const response = await api.get<Product>(`/v1/products/${productId}`)
    return response.data
  },

  searchProducts: async (
    storeId: number,
    query: string,
    page: number = 1,
    pageSize: number = 24
  ): Promise<ProductListResponse> => {
    const response = await api.get<ProductListResponse>(
      `/v1/stores/${storeId}/search`,
      {
        params: { q: query, page, page_size: pageSize },
      }
    )
    return response.data
  },
}
