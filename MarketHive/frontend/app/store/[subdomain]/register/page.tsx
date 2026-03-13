'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { customerApi } from '@/lib/api/customer'
import { useCustomerAuth } from '@/lib/context/CustomerAuthContext'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

export default function CustomerRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const subdomain = params.subdomain as string
  const { login } = useCustomerAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await customerApi.register(formData)
      login(response.customer, response.access_token, response.refresh_token)
      router.push(`/store/${subdomain}`)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href={`/store/${subdomain}/login`} className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
            />

            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
            />

            <Input
              label="Phone (optional)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h3>

              <div className="space-y-4">
                <Input
                  label="Address Line 1"
                  name="address_line1"
                  type="text"
                  required
                  value={formData.address_line1}
                  onChange={handleChange}
                />

                <Input
                  label="Address Line 2 (optional)"
                  name="address_line2"
                  type="text"
                  value={formData.address_line2}
                  onChange={handleChange}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleChange}
                  />

                  <Input
                    label="State"
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postal Code"
                    name="postal_code"
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={handleChange}
                  />

                  <Input
                    label="Country"
                    name="country"
                    type="text"
                    required
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
