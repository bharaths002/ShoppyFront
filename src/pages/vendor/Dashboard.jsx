import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import StatusBadge from '../../components/StatusBadge'
import { capitalize, formatDate, formatPrice } from '../../utils/format'

function shortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function compact(n) {
  return '₹' + new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

// plain SVG bar chart, no chart library
function RevenueChart({ data }) {
  const width = 640
  const height = 230
  const pad = { top: 16, right: 12, bottom: 30, left: 54 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(...data.map((d) => Number(d.revenue)), 1)
  const step = innerW / data.length
  const barW = Math.max(step * 0.62, 4)
  const labelEvery = data.length > 10 ? 5 : 1

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="Revenue per day">
      <line x1={pad.left} y1={pad.top + innerH} x2={width - pad.right} y2={pad.top + innerH} stroke="#e5e7eb" />
      <line x1={pad.left} y1={pad.top} x2={width - pad.right} y2={pad.top} stroke="#f3f4f6" />
      <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" className="chart-label">
        {compact(max)}
      </text>
      <text x={pad.left - 8} y={pad.top + innerH} textAnchor="end" className="chart-label">
        0
      </text>

      {data.map((d, i) => {
        const h = (Number(d.revenue) / max) * innerH
        const x = pad.left + i * step + (step - barW) / 2
        return (
          <g key={d.date}>
            <rect x={x} y={pad.top + innerH - h} width={barW} height={h} rx="3" fill="#e76f51">
              <title>{`${shortDate(d.date)}: ${formatPrice(d.revenue)} from ${d.orders} order(s)`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" className="chart-label">
                {shortDate(d.date)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function VendorDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [range, setRange] = useState(7)

  useEffect(() => {
    api
      .get('/api/vendors/dashboard/')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="form-error">{error}</p>
  if (!data) return <p className="muted">Loading dashboard...</p>

  const chartData = range === 7 ? data.revenue_last_7_days : data.revenue_last_30_days
  const rangeTotal = chartData.reduce((sum, d) => sum + Number(d.revenue), 0)
  const alerts = data.low_stock_count + data.out_of_stock_count

  return (
    <>
      <div className="v-head">
        <h1>Dashboard</h1>
        <p className="muted">{data.shop_name}</p>
      </div>

      {alerts > 0 && (
        <Link to="/vendor/inventory" className="v-alert">
          {data.out_of_stock_count} item(s) out of stock and {data.low_stock_count} running low. Review your inventory →
        </Link>
      )}

      <div className="v-cards">
        <div className="v-card">
          <p className="label">Revenue (all time)</p>
          <p className="value">{formatPrice(data.total_revenue)}</p>
          <p className="sub">{data.total_orders} orders · cancelled and returned excluded</p>
        </div>
        <div className="v-card">
          <p className="label">Your payout</p>
          <p className="value">{formatPrice(data.total_payout)}</p>
          <p className="sub">Commission paid {formatPrice(data.total_commission_paid)}</p>
        </div>
        <div className="v-card">
          <p className="label">This month</p>
          <p className="value">{formatPrice(data.this_month_revenue)}</p>
          <p className="sub">
            {data.this_month_orders} orders · payout {formatPrice(data.this_month_payout)}
          </p>
        </div>
        <div className="v-card">
          <p className="label">Products</p>
          <p className="value">
            {data.active_products} / {data.total_products}
          </p>
          <p className="sub">live / total</p>
        </div>
        <div className="v-card">
          <p className="label">Low stock</p>
          <p className="value">{data.low_stock_count}</p>
          <p className="sub">10 units or fewer</p>
        </div>
        <div className="v-card">
          <p className="label">Out of stock</p>
          <p className="value">{data.out_of_stock_count}</p>
          <p className="sub">need restocking</p>
        </div>
      </div>

      <div className="v-panel">
        <div className="v-panel-head">
          <h2>Revenue · last {range} days: {formatPrice(rangeTotal)}</h2>
          <div className="v-tabs">
            <button className={range === 7 ? 'active' : ''} onClick={() => setRange(7)}>
              7 days
            </button>
            <button className={range === 30 ? 'active' : ''} onClick={() => setRange(30)}>
              30 days
            </button>
          </div>
        </div>
        <RevenueChart data={chartData} />
      </div>

      <div className="v-panel">
        <h2>Orders by status</h2>
        <div className="v-chips">
          {Object.entries(data.orders_by_status).map(([status, count]) => (
            <div className="v-chip" key={status}>
              <span>{capitalize(status)}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="v-grid-2">
        <div className="v-panel">
          <h2>Best sellers</h2>
          {data.best_selling_products.length === 0 ? (
            <p className="muted">No sales yet.</p>
          ) : (
            <ul className="v-list">
              {data.best_selling_products.map((p) => (
                <li key={p.product_id}>
                  <div>
                    <strong>{p.product_name}</strong>
                    <p className="muted">{p.total_units_sold} sold</p>
                  </div>
                  <strong>{formatPrice(p.total_revenue)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="v-panel">
          <div className="v-panel-head">
            <h2>Recent orders</h2>
            <Link to="/vendor/orders" className="link-button">
              View all
            </Link>
          </div>
          {data.recent_orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <ul className="v-list">
              {data.recent_orders.map((o) => (
                <li key={o.order_id}>
                  <div>
                    <Link to={`/vendor/orders/${o.order_id}`}>
                      <strong>{o.order_number}</strong>
                    </Link>
                    <p className="muted">
                      {formatDate(o.created_at)} · {formatPrice(o.vendor_subtotal)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}