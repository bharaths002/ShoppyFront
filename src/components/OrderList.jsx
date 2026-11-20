import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import StatusBadge from './StatusBadge'
import { PAYMENT_METHOD_LABELS, capitalize, formatDate, formatPrice } from '../utils/format'
import '../pages/Orders.css'

// The customer's order history. Used inside the profile page (Orders tab).
export default function OrderList() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/orders/')
      .then(setOrders)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {!orders && !error && <p className="muted">Loading your orders...</p>}

      {orders && orders.length === 0 && (
        <div className="orders-empty">
          <p className="muted">You haven't placed any orders yet.</p>
          <Link to="/" className="shop-button">
            Start shopping
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="order-list">
          {orders.map((o) => (
            <Link to={`/orders/${o.id}`} className="order-row" key={o.id}>
              <div>
                <strong>{o.order_number}</strong>
                <p className="muted">
                  {formatDate(o.created_at)} · {o.item_count} item{o.item_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="order-row-mid">
                <StatusBadge status={o.status} />
                <p className="muted">
                  {PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method} · {capitalize(o.payment_status)}
                </p>
              </div>
              <strong>{formatPrice(o.total)}</strong>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}