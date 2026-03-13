'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { storesApi, StoreResponse } from '@/lib/api/stores'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'

export default function StoreSettings() {
  const router = useRouter()
  const params = useParams()
  const storeId = parseInt(params.id as string)
  const { accessToken, isAuthenticated } = useAuth()
  
  const [store, setStore] = useState<StoreResponse | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/business/login')
      return
    }

    loadStore()
  }, [isAuthenticated, storeId])

  const loadStore = async () => {
    try {
      const storeData = await storesApi.getById(storeId)
      setStore(storeData)
      setFormData({
        name: storeData.name,
        description: storeData.description,
      })
      setLogoPreview(storeData.logo_url)
    } catch (error) {
      setErrors({ general: 'Failed to load store' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErrors({ logo: 'Only JPEG, PNG, and WebP images are allowed' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ logo: 'Image must be less than 5MB' })
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setErrors({ ...errors, logo: '' })
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return

    setIsUploadingLogo(true)
    setErrors({})

    try {
      const result = await storesApi.uploadLogo(storeId, logoFile, accessToken!)
      setStore(result.store)
      setLogoPreview(result.logo_url)
      setLogoFile(null)
      setSuccessMessage('Logo uploaded successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      if (error.response?.data?.error) {
        setErrors({ logo: error.response.data.error.message })
      } else {
        setErrors({ logo: 'Failed to upload logo' })
      }
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setErrors({ name: 'Store name is required' })
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const updatedStore = await storesApi.update(storeId, formData, accessToken!)
      setStore(updatedStore)
      setSuccessMessage('Store settings updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      if (error.response?.data?.error) {
        const apiError = error.response.data.error
        if (apiError.details) {
          setErrors(apiError.details)
        } else {
          setErrors({ general: apiError.message || 'Update failed' })
        }
      } else {
        setErrors({ general: 'Network error. Please try again.' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
              ← Back to Dashboard
            </Link>
            <div className="flex space-x-4">
              <Link href={`/dashboard/stores/${storeId}/products`}>
                <Button variant="secondary">Manage Products</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Store Settings</h2>

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-6">
              {successMessage}
            </div>
          )}

          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
              {errors.general}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Store Logo</h3>
            
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Store logo"
                    className="h-24 w-24 object-cover rounded"
                  />
                ) : (
                  <div className="h-24 w-24 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400">No logo</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  JPEG, PNG, or WebP. Max 5MB.
                </p>
                {errors.logo && (
                  <p className="mt-1 text-sm text-red-600">{errors.logo}</p>
                )}
                {logoFile && (
                  <Button
                    onClick={handleUploadLogo}
                    isLoading={isUploadingLogo}
                    className="mt-2"
                  >
                    Upload Logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Store Information</h3>

            <Input
              label="Store Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={store?.subdomain}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-100 text-gray-500"
                />
                <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                  .markethive.com
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Subdomain cannot be changed</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />
            </div>

            <div className="mt-6">
              <Button type="submit" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
