import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import { PAYMENT_METHOD_LABELS, capitalize, formatDateTime, formatPrice } from '../../utils/format'

// pending -> shipped -> delivered, one step at a time (the backend enforces the same order)
const NEXT = {
  pending: { to: 'shipped', label: 'Mark as shipped' },
  shipped: { to: 'delivered', label: 'Mark as delivered' },
}

export default function VendorOrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    try {
      setOrder(await api.get(`/api/vendors/orders/${orderId}/`))
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      else setError(err.message)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  async function advance(item, to) {
    setBusyId(item.id)
    setActionError('')
    try {
      await api.patch(`/api/vendors/orders/${orderId}/items/${item.id}/status/`, { status: to })
      await load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (notFound) {
    return (
      <>
        <p className="muted">Order not found.</p>
        <Link to="/vendor/orders" className="link-button">
          ← Back to orders
        </Link>
      </>
    )
  }
  if (error) return <p className="form-error">{error}</p>
  if (!order) return <p className="muted">Loading order...</p>

  const canUpdate = ['confirmed', 'shipped'].includes(order.status)
  const address = order.shipping_address

  return (
    <>
      <Link to="/vendor/orders" className="v-back">
        ← All orders
      </Link>
      <div className="v-head">
        <div>
          <h1>Order {order.order_number}</h1>
          <p className="muted">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!canUpdate && (
        <p className="v-alert">
          {order.status === 'pending'
            ? 'This order is waiting for payment. You can ship it once it is confirmed.'
            : `This order is ${order.status}, so its items can't be updated.`}
        </p>
      )}
      {actionError && <p className="form-error">{actionError}</p>}

      <div className="v-panel">
        <h2>Your items</h2>
        <div className="v-table-wrap" style={{ border: 'none' }}>
          <table className="v-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Commission</th>
                <th>Payout</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {order.vendor_items.map((item) => {
                const itemStatus = item.status || 'pending'
                const next = NEXT[itemStatus]
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_name}</strong>
                      {item.variant_details && <p className="muted">{item.variant_details}</p>}
                      <p className="muted">
                        {formatPrice(item.unit_price)} × {item.quantity}
                      </p>
                    </td>
                    <td>{formatPrice(item.line_total)}</td>
                    <td>
                      {formatPrice(item.commission_amount)}
                      <p className="muted">{item.commission_rate}%</p>
                    </td>
                    <td>{formatPrice(item.vendor_payout)}</td>
                    <td>
                      <StatusBadge status={itemStatus} />
                    </td>
                    <td>
                      {canUpdate && next && (
                        <button className="btn-small" onClick={() => advance(item, next.to)} disabled={busyId === item.id}>
                          {busyId === item.id ? '...' : next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 14, fontSize: 14 }}>
          Your total <strong>{formatPrice(order.vendor_subtotal)}</strong> · your payout{' '}
          <strong>{formatPrice(order.vendor_total_payout)}</strong>
        </p>
      </div>

      <div className="v-grid-2">
        <div className="v-panel">
          <h2>Ship to</h2>
          {address?.full_name ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
              <strong>{address.full_name}</strong>
              <br />
              {address.address_line_1}
              {address.address_line_2 && `, ${address.address_line_2}`}
              <br />
              {address.city}, {address.state} {address.postal_code}
              <br />
              Phone: {address.phone_number}
            </p>
          ) : (
            <p className="muted">
              {[address?.city, address?.state].filter(Boolean).join(', ')}
              {address?.note && ` · ${address.note}`}
            </p>
          )}
        </div>

        <div className="v-panel">
          <h2>Payment</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
            {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
            <br />
            {capitalize(order.payment_status)}
          </p>
        </div>
      </div>
    </>
  )
}