import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import { PAYMENT_METHOD_LABELS, capitalize, formatDate, formatPrice } from '../../utils/format'

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']

export default function VendorOrders() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page, page_size: 10 })
    if (status) params.set('status', status)

    api
      .get(`/api/vendors/orders/?${params}`, { signal: controller.signal })
      .then((res) => {
        setData(res)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })

    return () => controller.abort()
  }, [status, page])

  return (
    <>
      <div className="v-head">
        <h1>Orders</h1>
      </div>

      <div className="v-toolbar">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All orders</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted">Loading orders...</p>}
      {data && data.results.length === 0 && <p className="muted">No orders found.</p>}

      {data && data.results.length > 0 && (
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th>Ship to</th>
                <th>Your total</th>
                <th>Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/vendor/orders/${o.id}`}>
                      <strong>{o.order_number}</strong>
                    </Link>
                    <p className="muted">{formatDate(o.created_at)}</p>
                  </td>
                  <td>
                    <div className="v-clip">{o.vendor_items.map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}</div>
                  </td>
                  <td>{[o.shipping_city, o.shipping_state].filter(Boolean).join(', ') || '—'}</td>
                  <td>
                    {formatPrice(o.vendor_subtotal)}
                    <p className="muted">{PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method}</p>
                  </td>
                  <td>{formatPrice(o.vendor_total_payout)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="v-pagination">
          <button disabled={!data.has_previous} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.total_pages}
          </span>
          <button disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  )
}