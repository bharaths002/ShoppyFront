import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import AddressForm from '../components/AddressForm'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import { loadRazorpay, openCheckout } from '../utils/razorpay'
import './Checkout.css'

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Cash on delivery', hint: 'Pay when your order arrives' },
  { value: 'upi', label: 'UPI', hint: 'Pay online with any UPI app' },
  { value: 'card', label: 'Credit / debit card', hint: 'Pay online with your card' },
]

function AddressOption({ address, name, checked, onChange }) {
  return (
    <label className={`address-option ${checked ? 'selected' : ''}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <div>
        <strong>{address.full_name}</strong>
        {address.is_default && <span className="pill default">Default</span>}
        <p>
          {address.address_line_1}
          {address.address_line_2 && `, ${address.address_line_2}`}, {address.city}, {address.state}{' '}
          {address.postal_code}
          <br />
          Phone: {address.phone_number}
        </p>
      </div>
    </label>
  )
}

// Uses .pill (Profile.css), .status-card (Profile.css), .inline-form (Profile.css), .btn-primary (Auth.css).
export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, refreshCart } = useCart()

  const [ready, setReady] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [shippingId, setShippingId] = useState(null)
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [billingId, setBillingId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')

  const [showForm, setShowForm] = useState(false)
  const [formTarget, setFormTarget] = useState('shipping') // which selection a new address fills
  const [savingAddress, setSavingAddress] = useState(false)
  const [formError, setFormError] = useState('')

  const [placing, setPlacing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [pendingOrder, setPendingOrder] = useState(null) // unpaid online order: { id, number }
  const [done, setDone] = useState(false)

  const loadAddresses = useCallback(async () => {
    const list = await api.get('/api/accounts/addresses/')
    setAddresses(list)
    return list
  }, [])

  useEffect(() => {
    Promise.all([loadAddresses(), refreshCart()])
      .then(([list]) => {
        const preferred = list.find((a) => a.is_default) || list[0]
        setShippingId(preferred ? preferred.id : null)
        setBillingId(preferred ? preferred.id : null)
        if (list.length === 0) setShowForm(true)
      })
      .catch((err) => setError(err.message))
      .finally(() => setReady(true))
  }, [loadAddresses, refreshCart])

  function openForm(target) {
    setFormTarget(target)
    setFormError('')
    setShowForm(true)
  }

  async function saveAddress(payload) {
    setSavingAddress(true)
    setFormError('')
    try {
      const created = await api.post('/api/accounts/addresses/', payload)
      await loadAddresses()
      if (formTarget === 'billing') setBillingId(created.id)
      else setShippingId(created.id)
      setShowForm(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSavingAddress(false)
    }
  }

  async function finish(orderId) {
    setDone(true)
    await refreshCart().catch(() => {}) // the backend has cleared the cart
    navigate(`/orders/${orderId}`, { replace: true, state: { placed: true } })
  }

  async function payOnline(order) {
    let payment
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Could not load the payment window. Check your connection and try again.')
      const phone = addresses.find((a) => a.id === shippingId)?.phone_number
      payment = await openCheckout({ order, method: paymentMethod, email: user?.contact, phone })
    } catch (err) {
      // the order exists and holds stock, but nothing was paid
      setPendingOrder({ id: order.order_id, number: order.order_number })
      setError(err.message)
      return
    }

    try {
      const result = await api.post('/api/orders/verify-payment/', {
        order_id: order.order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      })
      await finish(result.order.id)
    } catch (err) {
      setPendingOrder({ id: order.order_id, number: order.order_number })
      setError(`${err.message} If money was deducted, contact support with order number ${order.order_number}.`)
    }
  }

  async function placeOrder() {
    setError('')
    if (!shippingId) {
      setError('Please add or select a shipping address.')
      return
    }
    if (!sameAsShipping && !billingId) {
      setError('Please select a billing address.')
      return
    }

    setPlacing(true)
    try {
      const body = {
        shipping_address_id: shippingId,
        same_as_shipping: sameAsShipping,
        payment_method: paymentMethod,
      }
      if (!sameAsShipping) body.billing_address_id = billingId

      const data = await api.post('/api/orders/create/', body)

      // COD answers with the full order, UPI/card answers with the Razorpay details
      if (paymentMethod === 'cod') await finish(data.order.id)
      else await payOnline(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  async function cancelPending() {
    setCancelling(true)
    setError('')
    try {
      await api.post(`/api/orders/${pendingOrder.id}/cancel/`)
      setPendingOrder(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (!ready) {
    return (
      <section className="checkout-page">
        <p className="muted">Loading checkout...</p>
      </section>
    )
  }
  if (done) return null

  if (cart.items.length === 0 && !pendingOrder) {
    return (
      <section className="checkout-page checkout-empty">
        <h1>Your cart is empty</h1>
        {error && <p className="form-error">{error}</p>}
        <Link to="/" className="shop-button">
          Continue shopping
        </Link>
      </section>
    )
  }

  const hasShippingInfo = cart.shipping_fee !== undefined // optional cart field, see backend notes

  return (
    <section className="checkout-page">
      <h1>Checkout</h1>

      {pendingOrder && (
        <div className="status-card pending">
          <strong>Payment not completed</strong>
          <p>
            Order {pendingOrder.number} is on hold and your items are reserved. Cancel it to try again, or open it
            from your orders.
          </p>
          <div className="profile-actions">
            <button className="btn-small" onClick={cancelPending} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel that order and try again'}
            </button>
            <Link to={`/orders/${pendingOrder.id}`} className="btn-small">
              View order
            </Link>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-card">
            <h2>1. Shipping address</h2>

            {addresses.map((a) => (
              <AddressOption
                key={a.id}
                address={a}
                name="shipping"
                checked={shippingId === a.id}
                onChange={() => setShippingId(a.id)}
              />
            ))}

            {showForm && formTarget === 'shipping' ? (
              <div className="inline-form">
                <h3>New address</h3>
                <AddressForm
                  submitting={savingAddress}
                  error={formError}
                  submitLabel="Save and use this address"
                  onSubmit={saveAddress}
                  onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
                />
              </div>
            ) : (
              <button className="link-button add-link" onClick={() => openForm('shipping')}>
                + Add a new address
              </button>
            )}

            <label className="check-field same-billing">
              <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} />
              Billing address is the same as shipping
            </label>

            {!sameAsShipping && (
              <div className="billing-block">
                <h3>Billing address</h3>
                {addresses.map((a) => (
                  <AddressOption
                    key={a.id}
                    address={a}
                    name="billing"
                    checked={billingId === a.id}
                    onChange={() => setBillingId(a.id)}
                  />
                ))}

                {showForm && formTarget === 'billing' ? (
                  <div className="inline-form">
                    <h3>New address</h3>
                    <AddressForm
                      submitting={savingAddress}
                      error={formError}
                      submitLabel="Save and use this address"
                      onSubmit={saveAddress}
                      onCancel={() => setShowForm(false)}
                    />
                  </div>
                ) : (
                  <button className="link-button add-link" onClick={() => openForm('billing')}>
                    + Add a new address
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="checkout-card">
            <h2>2. Payment method</h2>
            {PAYMENT_OPTIONS.map((p) => (
              <label key={p.value} className={`address-option ${paymentMethod === p.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === p.value}
                  onChange={() => setPaymentMethod(p.value)}
                />
                <div>
                  <strong>{p.label}</strong>
                  <p>{p.hint}</p>
                </div>
              </label>
            ))}
          </section>
        </div>

        <aside className="checkout-summary">
          <h2>Order summary</h2>

          <ul className="summary-items">
            {cart.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.product.name}
                  {item.variant?.attributes.length > 0 && (
                    <small> ({item.variant.attributes.map((a) => a.value).join(' / ')})</small>
                  )}{' '}
                  × {item.quantity}
                </span>
                <span>{formatPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          {hasShippingInfo && (
            <div className="summary-row">
              <span>Shipping</span>
              <span>{Number(cart.shipping_fee) === 0 ? 'Free' : formatPrice(cart.shipping_fee)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatPrice(cart.total ?? cart.subtotal)}</span>
          </div>
          {!hasShippingInfo && <p className="summary-note">Shipping, if any, is added when you place the order.</p>}

          <button className="btn-primary" onClick={placeOrder} disabled={placing || Boolean(pendingOrder)}>
            {placing ? 'Placing order...' : paymentMethod === 'cod' ? 'Place order' : 'Pay and place order'}
          </button>
        </aside>
      </div>
    </section>
  )
}