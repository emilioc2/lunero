import api from '../api'

export interface StoreCreationData {
  name: string
  subdomain: string
  description: string
  color_scheme?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  theme?: string
}

export interface StoreUpdateData {
  name?: string
  description?: string
  color_scheme?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  theme?: string
}

export interface StoreResponse {
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

export const storesApi = {
  create: async (data: StoreCreationData, token: string) => {
    const response = await api.post<StoreResponse>('/v1/stores', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  getById: async (storeId: number) => {
    const response = await api.get<StoreResponse>(`/v1/stores/${storeId}`)
    return response.data
  },

  update: async (storeId: number, data: StoreUpdateData, token: string) => {
    const response = await api.put<StoreResponse>(`/v1/stores/${storeId}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  uploadLogo: async (storeId: number, file: File, token: string) => {
    const formData = new FormData()
    formData.append('logo', file)
    
    const response = await api.post(`/v1/stores/${storeId}/logo`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
