import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { PAYMENT_METHOD_LABELS, capitalize, formatDateTime, formatPrice } from '../utils/format'
import './Orders.css'

function AddressBlock({ title, address }) {
  return (
    <div className="order-card">
      <h2>{title}</h2>
      {address ? (
        <p className="address-lines">
          <strong>{address.full_name}</strong>
          <br />
          {address.address_line_1}
          {address.address_line_2 && `, ${address.address_line_2}`}
          <br />
          {address.city}, {address.state} {address.postal_code}
          <br />
          {address.country}
          <br />
          Phone: {address.phone_number}
        </p>
      ) : (
        <p className="muted">This address is no longer available.</p>
      )}
    </div>
  )
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const location = useLocation()
  const justPlaced = Boolean(location.state?.placed)

  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setOrder(null)
    setError('')
    setNotFound(false)
    api
      .get(`/api/orders/${orderId}/`)
      .then(setOrder)
      .catch((err) => {
        if (err.status === 404) setNotFound(true)
        else setError(err.message)
      })
  }, [orderId])

  async function cancelOrder() {
    if (!window.confirm('Cancel this order? Your items will go back into stock.')) return
    setCancelling(true)
    setActionError('')
    try {
      const data = await api.post(`/api/orders/${orderId}/cancel/`)
      setOrder(data.order)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (notFound) {
    return (
      <section className="page-message">
        <h2>Order not found</h2>
        <p>We couldn't find that order on your account.</p>
        <Link to="/orders" className="shop-button">
          Back to orders
        </Link>
      </section>
    )
  }
  if (error) {
    return (
      <section className="order-page">
        <p className="form-error">{error}</p>
      </section>
    )
  }
  if (!order) {
    return (
      <section className="order-page">
        <p className="muted">Loading order...</p>
      </section>
    )
  }

  const isOnline = order.payment_method !== 'cod'
  const open = ['pending', 'confirmed'].includes(order.status)
  const paidOnline = isOnline && order.payment_status === 'paid'
  const unpaidOnline = isOnline && order.payment_status !== 'paid' && order.status !== 'cancelled'
  // Paid online orders are not cancellable from the site until the backend issues refunds.
  const canCancel = open && !paidOnline

  return (
    <section className="order-page">
      <Link to="/orders" className="back-link">
        ← All orders
      </Link>

      {justPlaced && <p className="form-info">Thank you! Your order has been placed.</p>}

      <div className="order-head">
        <div>
          <h1>Order {order.order_number}</h1>
          <p className="muted">Placed on {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {unpaidOnline && (
        <div className="status-card pending">
          <strong>Payment not completed</strong>
          <p>This order won't be processed until it is paid. You can cancel it and place a new one.</p>
        </div>
      )}
      {open && paidOnline && (
        <div className="status-card approved">
          <strong>Paid online</strong>
          <p>To cancel this order or ask for a refund, please contact support.</p>
        </div>
      )}

      <div className="order-grid">
        <div className="order-card">
          <h2>Items</h2>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  {item.variant_details && <p className="muted">{item.variant_details}</p>}
                  <p className="muted">
                    {formatPrice(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <strong>{formatPrice(item.line_total)}</strong>
              </li>
            ))}
          </ul>

          <div className="order-totals">
            <div>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>{Number(order.shipping_fee) === 0 ? 'Free' : formatPrice(order.shipping_fee)}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="order-side">
          <div className="order-card">
            <h2>Payment</h2>
            <p className="address-lines">
              {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
              <br />
              <span className={`pay-status ${order.payment_status}`}>{capitalize(order.payment_status)}</span>
            </p>
          </div>

          <AddressBlock title="Shipping address" address={order.shipping_address} />
          <AddressBlock title="Billing address" address={order.billing_address} />
        </div>
      </div>

      <div className="order-card">
        <h2>Order history</h2>
        <ul className="history">
          {order.status_history.map((h, i) => (
            <li key={i}>
              <StatusBadge status={h.status} />
              <span>{h.note || '—'}</span>
              <span className="muted">{formatDateTime(h.changed_at)}</span>
            </li>
          ))}
        </ul>
      </div>

      {actionError && <p className="form-error">{actionError}</p>}
      {canCancel && (
        <button className="btn-small danger cancel-order" onClick={cancelOrder} disabled={cancelling}>
          {cancelling ? 'Cancelling...' : 'Cancel order'}
        </button>
      )}
    </section>
  )
}