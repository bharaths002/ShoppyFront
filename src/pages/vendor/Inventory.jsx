import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'

const PLACEHOLDER = 'https://placehold.co/88x88?text=No+Image'
const STATUS_LABELS = { in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock' }

function StockPill({ status }) {
  return <span className={`stock-pill ${status}`}>{STATUS_LABELS[status] || status}</span>
}

function StockInput({ value, onSave }) {
  const [text, setText] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changed = text !== String(value)

  async function save() {
    if (!/^\d+$/.test(text)) {
      setError('Whole number, 0 or more')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(Number(text))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="stock-in">
        <input type="number" min="0" step="1" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-small" onClick={save} disabled={!changed || saving}>
          {saving ? '...' : 'Save'}
        </button>
      </div>
      {error && <p className="card-error">{error}</p>}
    </div>
  )
}

// "SKU,stock" per line (a pasted spreadsheet column pair works too)
function parseBulk(text) {
  const updates = []
  const bad = []
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^(\S+?)[\s,;]+(\d+)$/)
      if (match) updates.push({ sku: match[1], stock: Number(match[2]) })
      else bad.push(line)
    })
  return { updates, bad }
}

function BulkUpdate({ onDone }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function submit() {
    setError('')
    setResult(null)
    const { updates, bad } = parseBulk(text)
    if (bad.length) return setError(`Can't read these lines: ${bad.slice(0, 3).join(' | ')}`)
    if (updates.length === 0) return setError('Add at least one line like ABC123DEF456,50')
    if (updates.length > 100) return setError('At most 100 updates per request.')
    if (new Set(updates.map((u) => u.sku)).size !== updates.length) return setError('Each SKU can only appear once.')

    setBusy(true)
    try {
      const data = await api.post('/api/vendors/inventory/bulk-update/', { updates })
      setResult(data)
      setText('')
      await onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v-panel">
      <h2>Bulk update stock</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        One variant per line as <code>SKU,stock</code>. Up to 100 lines. Unknown SKUs are skipped.
      </p>
      <textarea
        className="bulk-box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'ABC123DEF456,50\nXYZ789GHI012,0'}
      />
      {error && <p className="form-error">{error}</p>}
      {result && (
        <p className="form-info">
          {result.message}
          {result.skipped_count > 0 && ` Skipped: ${result.skipped_skus.join(', ')}`}
        </p>
      )}
      <div className="v-actions">
        <button className="btn-secondary" onClick={submit} disabled={busy}>
          {busy ? 'Updating...' : 'Apply updates'}
        </button>
      </div>
    </div>
  )
}

export default function VendorInventory() {
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState({ search: '', stock_status: '', page: 1 })
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: filters.page, page_size: 20 })
    if (filters.search) params.set('search', filters.search)
    if (filters.stock_status) params.set('stock_status', filters.stock_status)

    api
      .get(`/api/vendors/inventory/?${params}`, { signal: controller.signal })
      .then((res) => {
        setData(res)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })

    return () => controller.abort()
  }, [filters, reloadKey])

  const reload = async () => setReloadKey((k) => k + 1)

  async function saveSimple(product, stock) {
    await api.patch(`/api/vendors/inventory/${product.slug}/stock/`, { stock })
    await reload()
  }

  async function saveVariant(product, variant, stock) {
    await api.patch(`/api/vendors/inventory/${product.slug}/variants/${variant.sku}/stock/`, { stock })
    await reload()
  }

  const summary = data?.summary

  return (
    <>
      <div className="v-head">
        <h1>Inventory</h1>
      </div>

      {summary && (
        <div className="v-cards">
          <div className="v-card">
            <p className="label">Stock value</p>
            <p className="value">{formatPrice(summary.total_stock_value)}</p>
            <p className="sub">{summary.total_products} products</p>
          </div>
          <div className="v-card">
            <p className="label">Low stock</p>
            <p className="value">{summary.low_stock}</p>
            <p className="sub">1 to 10 units</p>
          </div>
          <div className="v-card">
            <p className="label">Out of stock</p>
            <p className="value">{summary.out_of_stock}</p>
            <p className="sub">{summary.in_stock} healthy</p>
          </div>
        </div>
      )}

      <div className="v-toolbar">
        <input
          type="search"
          placeholder="Search by product name or SKU"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          value={filters.stock_status}
          onChange={(e) => setFilters((f) => ({ ...f, stock_status: e.target.value, page: 1 }))}
        >
          <option value="">All stock levels</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted">Loading inventory...</p>}
      {data && data.products.length === 0 && <p className="muted">No products match.</p>}

      {data && data.products.length > 0 && (
        <div className="v-table-wrap" style={{ marginBottom: 20 }}>
          <table className="v-table">
            <thead>
              <tr>
                <th>Product / variant</th>
                <th>Status</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <FragmentRows key={p.id} product={p} saveSimple={saveSimple} saveVariant={saveVariant} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="v-pagination">
          <button disabled={!data.has_previous} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.total_pages}
          </span>
          <button disabled={!data.has_next} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
            Next
          </button>
        </div>
      )}

      <BulkUpdate onDone={reload} />
    </>
  )
}

// one product row, plus a row per variant when the product has variants
function FragmentRows({ product, saveSimple, saveVariant }) {
  return (
    <>
      <tr>
        <td>
          <div className="v-name">
            <img className="v-thumb" src={product.primary_image || PLACEHOLDER} alt="" />
            <div>
              <Link to={`/vendor/products/${product.slug}`}>
                <strong>{product.name}</strong>
              </Link>
              {product.has_variants && <p className="muted">{product.variants.length} variants</p>}
            </div>
          </div>
        </td>
        <td>
          <StockPill status={product.stock_status} />
        </td>
        <td>
          {product.has_variants ? (
            <span>{product.total_stock} in total</span>
          ) : (
            <StockInput value={product.stock} onSave={(stock) => saveSimple(product, stock)} />
          )}
        </td>
      </tr>

      {product.has_variants &&
        product.variants.map((v) => (
          <tr className="sub-row" key={v.id}>
            <td>
              ↳ {v.attributes.map((a) => `${a.attribute}: ${a.value}`).join(' · ') || 'Variant'}{' '}
              <span className="muted">({v.sku})</span>
            </td>
            <td>
              <StockPill status={v.stock_status} />
            </td>
            <td>
              <StockInput value={v.stock} onSave={(stock) => saveVariant(product, v, stock)} />
            </td>
          </tr>
        ))}
    </>
  )
}