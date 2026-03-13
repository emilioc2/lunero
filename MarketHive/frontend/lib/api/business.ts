import api from '../api'

export interface BusinessRegistrationData {
  business_name: string
  email: string
  password: string
  business_details?: string
}

export interface BusinessLoginData {
  email: string
  password: string
}

export interface BusinessResponse {
  id: number
  business_name: string
  email: string
  email_verified: boolean
  business_details: string
  created_at: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  business: BusinessResponse
}

export const businessApi = {
  register: async (data: BusinessRegistrationData) => {
    const response = await api.post<BusinessResponse>('/v1/business/register', data)
    return response.data
  },

  login: async (data: BusinessLoginData) => {
    const response = await api.post<LoginResponse>('/v1/business/login', data)
    return response.data
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/v1/business/verify-email', { token })
    return response.data
  },
}
