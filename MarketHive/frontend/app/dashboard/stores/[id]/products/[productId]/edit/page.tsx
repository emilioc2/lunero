'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { productsApi, ProductResponse } from '@/lib/api/products'
import { Input } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const storeId = parseInt(params.id as string)
  const productId = parseInt(params.productId as string)
  const { accessToken, isAuthenticated } = useAuth()
  
  const [product, setProduct] = useState<ProductResponse | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: 0,
    category: '',
    weight_grams: 0,
  })
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/business/login')
      return
    }

    loadProduct()
  }, [isAuthenticated, productId])

  const loadProduct = async () => {
    try {
      const products = await productsApi.getByStore(storeId, accessToken!)
      const foundProduct = products.find(p => p.id === productId)
      
      if (!foundProduct) {
        setErrors({ general: 'Product not found' })
        return
      }

      setProduct(foundProduct)
      setFormData({
        name: foundProduct.name,
        description: foundProduct.description,
        price: foundProduct.price,
        quantity: foundProduct.quantity,
        category: foundProduct.category,
        weight_grams: foundProduct.weight_grams,
      })
      
      if (foundProduct.images) {
        setImagePreviews(foundProduct.images.map(img => img.url))
      }
    } catch (error) {
      setErrors({ general: 'Failed to load product' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    const invalidFiles = files.filter(f => !validTypes.includes(f.type) || f.size > 5 * 1024 * 1024)
    
    if (invalidFiles.length > 0) {
      setErrors({ images: 'All images must be JPEG, PNG, or WebP and under 5MB' })
      return
    }

    setImages(files)
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setImagePreviews([...imagePreviews, ...newPreviews])
    setErrors({ ...errors, images: '' })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      await productsApi.update(productId, formData, accessToken!)
      
      if (images.length > 0) {
        await productsApi.uploadImages(productId, images, accessToken!)
      }

      setSuccessMessage('Product updated successfully')
      setTimeout(() => {
        router.push(`/dashboard/stores/${storeId}/products`)
      }, 1500)
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
          <div className="flex h-16 items-center">
            <Link
              href={`/dashboard/stores/${storeId}/products`}
              className="text-indigo-600 hover:text-indigo-500"
            >
              ← Back to Products
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h2>

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

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              
              {imagePreviews.length > 0 && (
                <div className="mb-4 grid grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <img
                      key={index}
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-20 w-20 object-cover rounded"
                    />
                  ))}
                </div>
              )}
              
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Add more images (JPEG, PNG, or WebP. Max 5MB per image)
              </p>
              {errors.images && (
                <p className="mt-1 text-sm text-red-600">{errors.images}</p>
              )}
            </div>

            <Input
              label="Product Name *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={4}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Price *"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                error={errors.price}
              />

              <Input
                label="Quantity *"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                error={errors.quantity}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home</option>
                  <option value="Sports">Sports</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>
            </div>

            <Input
              label="Weight (grams)"
              type="number"
              min="0"
              value={formData.weight_grams}
              onChange={(e) =>
                setFormData({ ...formData, weight_grams: parseInt(e.target.value) || 0 })
              }
            />

            <div className="mt-6 flex space-x-4">
              <Button type="submit" isLoading={isSaving}>
                Save Changes
              </Button>
              <Link href={`/dashboard/stores/${storeId}/products`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
