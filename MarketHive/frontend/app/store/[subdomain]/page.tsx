'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { storefrontApi, Product, StoreInfo } from '@/lib/api/storefront'
import { useCart } from '@/lib/context/CartContext'
import { useCustomerAuth } from '@/lib/context/CustomerAuthContext'

export default function StorefrontPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const subdomain = params.subdomain as string
  const { getItemCount, refreshCart } = useCart()
  const { isAuthenticated, customer, logout } = useCustomerAuth()

  const [store, setStore] = useState<StoreInfo | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const page = parseInt(searchParams.get('page') || '1')
  const category = searchParams.get('category') || undefined
  const query = searchParams.get('q') || undefined

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setSearchQuery(query || '')
  }, [query])

  useEffect(() => {
    loadStoreAndProducts()
  }, [subdomain, page, category, query])

  // Refresh cart when store is loaded
  useEffect(() => {
    if (store) {
      refreshCart(store.id)
    }
  }, [store?.id])

  const loadStoreAndProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load store info
      const storeData = await storefrontApi.getStoreBySubdomain(subdomain)
      setStore(storeData)

      // Load products (search or browse)
      let productsData
      if (query) {
        setSearching(true)
        productsData = await storefrontApi.searchProducts(
          storeData.id,
          query,
          page,
          24
        )
        setSearching(false)
      } else {
        productsData = await storefrontApi.getProducts(
          storeData.id,
          page,
          24,
          category
        )
      }
      setProducts(productsData.products)
      setTotal(productsData.total)
      setHasNext(productsData.has_next)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load store')
      setSearching(false)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search handler
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        const params = new URLSearchParams()
        params.set('q', value.trim())
        router.push(`/store/${subdomain}?${params.toString()}`)
      } else {
        router.push(`/store/${subdomain}`)
      }
    }, 300)
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Clear debounce timer and search immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    router.push(`/store/${subdomain}?${params.toString()}`)
  }

  const handleCategoryChange = (newCategory: string | null) => {
    const params = new URLSearchParams()
    if (newCategory) {
      params.set('category', newCategory)
    }
    router.push(`/store/${subdomain}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    params.set('page', newPage.toString())
    if (category) {
      params.set('category', category)
    }
    if (query) {
      params.set('q', query)
    }
    router.push(`/store/${subdomain}?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading store...</div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The store you are looking for does not exist.'}</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700">
            Go to Homepage
          </Link>
        </div>
      </div>
    )
  }

  // Extract unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {store.logo_url && (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-16 w-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
                <p className="text-gray-600 mt-1">{store.description}</p>
              </div>
            </div>
            
            {/* Navigation Icons */}
            <div className="flex items-center space-x-4">
              {/* Account Menu */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/store/${subdomain}/orders`}
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Orders
                  </Link>
                  <span className="text-gray-600">Hi, {customer?.name}</span>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/store/${subdomain}/login`}
                    className="text-gray-700 hover:text-indigo-600"
                  >
                    Login
                  </Link>
                  <Link
                    href={`/store/${subdomain}/register`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
              
              {/* Cart Icon */}
              <Link
                href={`/store/${subdomain}/cart`}
                className="relative text-gray-700 hover:text-indigo-600 p-2"
              >
                <svg
                  className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {getItemCount() > 0 && (
                <span className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getItemCount()}
                </span>
              )}
            </Link>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="animate-spin h-5 w-5 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current)
                    }
                    router.push(`/store/${subdomain}`)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Category Filter Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleCategoryChange(null)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      !category
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Products
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        category === cat
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {query && (
              <div className="mb-4 text-gray-600">
                {products.length > 0 ? (
                  <p>Found {total} result{total !== 1 ? 's' : ''} for "{query}"</p>
                ) : (
                  <p>No results found for "{query}"</p>
                )}
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">
                  {query ? `No products found matching "${query}".` : 'No products found.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => {
                    const primaryImage = product.images.find((img) => img.is_primary) || product.images[0]
                    const isAvailable = product.quantity > 0

                    return (
                      <Link
                        key={product.id}
                        href={`/store/${subdomain}/product/${product.id}`}
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        <div className="aspect-square relative bg-gray-100">
                          {primaryImage ? (
                            <img
                              src={primaryImage.url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <span className="text-white font-semibold">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-indigo-600">
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                            {isAvailable && (
                              <span className="text-sm text-green-600">In Stock</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Pagination */}
                {total > 24 && (
                  <div className="mt-8 flex items-center justify-center space-x-4">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-gray-700">
                      Page {page} of {Math.ceil(total / 24)}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={!hasNext}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
