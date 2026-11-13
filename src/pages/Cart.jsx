import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import './Cart.css'

const PLACEHOLDER = 'https://placehold.co/120x120?text=No+Image'

export default function Cart() {
  const { cart, refreshCart, updateQuantity, removeItem, clearCart } = useCart()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [ready, setReady] = useState(false)
  const [busyId, setBusyId] = useState(null) // item id, or 'all'
  const [error, setError] = useState('')

  // always show the server's version of the cart when this page opens
  useEffect(() => {
    refreshCart()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true))
  }, [refreshCart])

  async function run(id, action) {
    setBusyId(id)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err.message) // e.g. "Only 3 item(s) available in stock."
    } finally {
      setBusyId(null)
    }
  }

  function handleClear() {
    if (!window.confirm('Remove all items from your cart?')) return
    run('all', clearCart)
  }

  function goToCheckout() {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  if (!ready) {
    return (
      <section className="cart-page">
        <p className="muted">Loading your cart...</p>
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section className="cart-page empty-cart">
        <h1>Your cart is empty</h1>
        {error && <p className="form-error">{error}</p>}
        <p className="muted">Looks like you haven't added anything yet.</p>
        <Link to="/" className="shop-button">
          Continue shopping
        </Link>
      </section>
    )
  }

  return (
    <section className="cart-page">
      <h1>Shopping cart</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="cart-layout">
        <div>
          <ul className="cart-list">
            {cart.items.map((item) => {
              const busy = busyId === item.id || busyId === 'all'
              const detailPath = `/products/${item.product.slug}`
              const atMax = item.stock != null && item.quantity >= item.stock // `stock` is optional on the backend

              return (
                <li className="cart-item" key={item.id}>
                  <Link to={detailPath}>
                    <img src={item.product.primary_image || PLACEHOLDER} alt={item.product.name} />
                  </Link>

                  <div>
                    <Link to={detailPath}>
                      <h3>{item.product.name}</h3>
                    </Link>
                    {item.variant && (
                      <p className="variant-text">
                        {item.variant.attributes.length
                          ? item.variant.attributes.map((a) => `${a.attribute}: ${a.value}`).join(' · ')
                          : item.variant.sku}
                      </p>
                    )}
                    <p className="unit-price">{formatPrice(item.unit_price)} each</p>

                    <div className="qty-stepper">
                      <button
                        onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity - 1))}
                        disabled={busy || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => run(item.id, () => updateQuantity(item.id, item.quantity + 1))}
                        disabled={busy || atMax}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-side">
                    <strong>{formatPrice(item.line_total)}</strong>
                    <button className="link-button" onClick={() => run(item.id, () => removeItem(item.id))} disabled={busy}>
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <button className="link-button clear-cart" onClick={handleClear} disabled={busyId === 'all'}>
            Clear cart
          </button>
        </div>

        <aside className="cart-summary">
          <h2>Order summary</h2>
          <div className="summary-row">
            <span>Items ({cart.total_items})</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="summary-row total">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="summary-note">The final total is confirmed at checkout.</p>

          <button className="btn-primary" onClick={goToCheckout}>
            {isLoggedIn ? 'Proceed to checkout' : 'Log in to checkout'}
          </button>
        </aside>
      </div>
    </section>
  )
}