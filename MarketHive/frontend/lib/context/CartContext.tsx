'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Cart, cartApi } from '../api/cart'

interface CartContextType {
  cart: Cart | null
  loading: boolean
  addToCart: (storeId: number, productId: number, quantity: number) => Promise<void>
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refreshCart: (storeId: number) => Promise<void>
  getItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  // Load cart from localStorage on mount (for guest users)
  useEffect(() => {
    const storedCart = localStorage.getItem('cart')
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart))
      } catch (e) {
        console.error('Failed to parse stored cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes (for guest users)
  useEffect(() => {
    if (cart) {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart])

  const refreshCart = async (storeId: number) => {
    try {
      setLoading(true)
      const cartData = await cartApi.getCart(storeId)
      setCart(cartData)
    } catch (error: any) {
      console.error('Failed to refresh cart:', error)
      // If cart doesn't exist, set to null
      if (error.response?.status === 404) {
        setCart(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (storeId: number, productId: number, quantity: number) => {
    try {
      setLoading(true)
      const response = await cartApi.addItem(storeId, { product_id: productId, quantity })
      setCart(response.cart)
    } catch (error) {
      console.error('Failed to add to cart:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    try {
      setLoading(true)
      const response = await cartApi.updateItem(cartItemId, { quantity })
      setCart(response.cart)
    } catch (error) {
      console.error('Failed to update quantity:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (cartItemId: number) => {
    try {
      setLoading(true)
      await cartApi.removeItem(cartItemId)
      // Refresh cart after removal
      if (cart) {
        await refreshCart(cart.store_id)
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getItemCount = () => {
    return cart?.item_count || 0
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
