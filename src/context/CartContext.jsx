import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

// Guests have no token: the backend tracks their cart with the Django session cookie.
// This flag remembers that a guest cart exists, so visitors who never add anything
// don't make the backend create an empty session + cart row on every page load.
const GUEST_FLAG = 'shoppy_guest_cart'
const EMPTY_CART = { items: [], total_items: 0, subtotal: '0.00' }

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth()
  const [cart, setCart] = useState(EMPTY_CART)

  const refreshCart = useCallback(async () => {
    setCart(await api.get('/api/cart/'))
  }, [])

  // login merges the guest cart into the account on the backend, logout goes back to a guest
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.removeItem(GUEST_FLAG)
      refreshCart().catch(() => {})
    } else if (localStorage.getItem(GUEST_FLAG)) {
      refreshCart().catch(() => {})
    } else {
      setCart(EMPTY_CART)
    }
  }, [isLoggedIn, refreshCart])

  const addItem = useCallback(
    async ({ productId, variantId = null, quantity = 1 }) => {
      const body = { product_id: productId, quantity }
      if (variantId) body.variant_id = variantId
      const data = await api.post('/api/cart/items/', body)
      setCart(data.cart)
      if (!isLoggedIn) localStorage.setItem(GUEST_FLAG, '1')
      return data
    },
    [isLoggedIn],
  )

  const updateQuantity = useCallback(async (itemId, quantity) => {
    const data = await api.patch(`/api/cart/items/${itemId}/`, { quantity })
    setCart(data.cart)
  }, [])

  const removeItem = useCallback(async (itemId) => {
    const data = await api.del(`/api/cart/items/${itemId}/`)
    setCart(data.cart)
  }, [])

  const clearCart = useCallback(async () => {
    await api.del('/api/cart/')
    setCart(EMPTY_CART)
  }, [])

  const value = useMemo(
    () => ({ cart, count: cart.total_items, refreshCart, addItem, updateQuantity, removeItem, clearCart }),
    [cart, refreshCart, addItem, updateQuantity, removeItem, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  return useContext(CartContext)
}