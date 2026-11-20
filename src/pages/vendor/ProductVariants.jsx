import { useState } from 'react'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'

const variantLabel = (v) => v.attributes.map((a) => `${a.attribute_name}: ${a.value}`).join(' · ') || v.sku

// same rule as the backend: a discount must be lower than the price it applies to
function priceProblem(price, discount, productPrice) {
  if (price !== '' && !(Number(price) > 0)) return 'Price must be greater than zero.'
  if (discount !== '') {
    const base = price !== '' ? Number(price) : Number(productPrice)
    if (!(Number(discount) > 0 && Number(discount) < base)) return 'Discount price must be greater than zero and less than the price.'
  }
  return ''
}

function VariantCard({ product, variant, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(variant.price ?? '')
  const [discount, setDiscount] = useState(variant.discount_price ?? '')
  const [stock, setStock] = useState(String(variant.stock))
  const [active, setActive] = useState(variant.is_active)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const url = `/api/vendors/products/${product.slug}/variants/${variant.sku}/`

  async function save(e) {
    e.preventDefault()
    const problem = priceProblem(price, discount, product.price)
    if (problem) return setError(problem)
    if (!/^\d+$/.test(stock)) return setError('Stock must be a whole number (0 or more).')

    setBusy(true)
    setError('')
    try {
      // null clears a price override, so the variant follows the product price again
      await api.patch(url, {
        price: price === '' ? null : price,
        discount_price: discount === '' ? null : discount,
        stock: Number(stock),
        is_active: active,
      })
      setEditing(false)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this variant permanently?')) return
    setBusy(true)
    setError('')
    try {
      await api.del(url)
      await onChanged()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="variant-card">
      <div className="variant-top">
        <div>
          <strong>{variantLabel(variant)}</strong>
          <p>
            SKU {variant.sku} · {formatPrice(variant.effective_price)} · {variant.stock} in stock
          </p>
        </div>
        <div className="v-actions">
          <span className={`pill ${variant.is_active ? 'live' : 'draft'}`}>{variant.is_active ? 'Active' : 'Hidden'}</span>
          <button className="btn-small" onClick={() => setEditing((v) => !v)} disabled={busy}>
            {editing ? 'Close' : 'Edit'}
          </button>
          <button className="btn-small danger" onClick={remove} disabled={busy}>
            Delete
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {editing && (
        <form onSubmit={save} style={{ marginTop: 14 }}>
          <div className="form-grid">
            <label className="field">
              Price override (₹, blank = product price)
              <input type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="field">
              Discount price (₹, optional)
              <input type="number" step="0.01" min="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label className="field">
              Stock
              <input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            </label>
            <label className="check-field">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Visible to customers
            </label>
          </div>
          <div className="v-actions">
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save variant'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function AddVariant({ product, attributeTypes, onChanged }) {
  const [rows, setRows] = useState([{ attribute_type_id: '', value: '' }])
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [stock, setStock] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function setRow(index, patch) {
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function submit(e) {
    e.preventDefault()
    const filled = rows.filter((r) => r.attribute_type_id && r.value.trim())
    if (filled.length === 0) return setError('Add at least one attribute, for example Size = XL.')
    if (new Set(filled.map((r) => r.attribute_type_id)).size !== filled.length) {
      return setError('Each attribute type can only be used once per variant.')
    }
    const problem = priceProblem(price, discount, product.price)
    if (problem) return setError(problem)
    if (!/^\d+$/.test(stock)) return setError('Stock must be a whole number (0 or more).')

    const body = {
      stock: Number(stock),
      is_active: true,
      attributes: filled.map((r) => ({ attribute_type_id: Number(r.attribute_type_id), value: r.value.trim() })),
    }
    if (price !== '') body.price = price
    if (discount !== '') body.discount_price = discount

    setBusy(true)
    setError('')
    try {
      await api.post(`/api/vendors/products/${product.slug}/variants/`, body)
      setRows([{ attribute_type_id: '', value: '' }])
      setPrice('')
      setDiscount('')
      setStock('0')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (attributeTypes.length === 0) {
    return (
      <p className="muted">
        No attribute types exist yet (for example Size or Colour). Ask the platform admin to add them in the admin panel.
      </p>
    )
  }

  return (
    <form onSubmit={submit}>
      <h3 style={{ margin: '20px 0 12px', fontSize: 15 }}>Add a variant</h3>
      {error && <p className="form-error">{error}</p>}

      {rows.map((row, i) => (
        <div className="attr-row" key={i}>
          <select value={row.attribute_type_id} onChange={(e) => setRow(i, { attribute_type_id: e.target.value })}>
            <option value="">Attribute</option>
            {attributeTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input placeholder="Value, e.g. XL" value={row.value} onChange={(e) => setRow(i, { value: e.target.value })} />
          <button
            type="button"
            className="btn-small"
            onClick={() => setRows((list) => list.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="link-button"
        onClick={() => setRows((list) => [...list, { attribute_type_id: '', value: '' }])}
        style={{ marginBottom: 16 }}
      >
        + Add another attribute
      </button>

      <div className="form-grid">
        <label className="field">
          Price override (₹, optional)
          <input type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="field">
          Discount price (₹, optional)
          <input type="number" step="0.01" min="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <label className="field">
          Stock
          <input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
        </label>
      </div>

      <div className="v-actions">
        <button className="btn-secondary" disabled={busy}>
          {busy ? 'Adding...' : 'Add variant'}
        </button>
      </div>
    </form>
  )
}

export default function ProductVariants({ product, attributeTypes, onChanged }) {
  return (
    <div className="v-panel">
      <h2>Variants</h2>
      {product.variants.length === 0 ? (
        <p className="muted">No variants yet. A product with variants can't be bought until at least one is added.</p>
      ) : (
        product.variants.map((v) => <VariantCard key={v.id} product={product} variant={v} onChanged={onChanged} />)
      )}
      <AddVariant product={product} attributeTypes={attributeTypes} onChanged={onChanged} />
    </div>
  )
}