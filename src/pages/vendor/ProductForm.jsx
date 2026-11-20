import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import ProductImages from './ProductImages'
import ProductVariants from './ProductVariants'

const EMPTY = {
  name: '',
  description: '',
  category: '',
  brand: '',
  price: '',
  discount_price: '',
  stock: '0',
  has_variants: false,
}

function fromProduct(p) {
  return {
    name: p.name,
    description: p.description || '',
    category: p.category ? String(p.category.id) : '',
    brand: p.brand ? String(p.brand.id) : '',
    price: p.price,
    discount_price: p.discount_price ?? '',
    stock: String(p.stock),
    has_variants: p.has_variants,
  }
}

// same rules as the backend serializer
function validate(v) {
  if (v.name.trim().length < 3) return 'Product name must be at least 3 characters.'
  const price = Number(v.price)
  if (!(price > 0)) return 'Enter a price greater than zero.'
  if (v.discount_price !== '' && !(Number(v.discount_price) > 0 && Number(v.discount_price) < price)) {
    return 'Discount price must be greater than zero and less than the price.'
  }
  if (!v.has_variants && !/^\d+$/.test(String(v.stock))) return 'Stock must be a whole number (0 or more).'
  return ''
}

// Create at /vendor/products/new, edit at /vendor/products/:slug
export default function VendorProductForm() {
  const { slug } = useParams()
  const isNew = !slug
  const navigate = useNavigate()
  const location = useLocation()

  const [options, setOptions] = useState({ categories: [], brands: [], attribute_types: [] })
  const [product, setProduct] = useState(null)
  const [values, setValues] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(
    location.state?.created ? 'Product created. Add images and variants below, then publish it.' : '',
  )

  useEffect(() => {
    api
      .get('/api/products/filters/', { auth: false })
      .then(setOptions)
      .catch(() => {})
  }, [])

  const loadProduct = useCallback(async () => {
    try {
      const data = await api.get(`/api/vendors/products/${slug}/`)
      setProduct(data)
      setValues(fromProduct(data))
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (!isNew) loadProduct()
  }, [isNew, loadProduct])

  // images / variants changed: re-read the product, but keep what is typed in the form
  const refreshProduct = useCallback(async () => {
    try {
      setProduct(await api.get(`/api/vendors/products/${slug}/`))
    } catch (err) {
      setError(err.message)
    }
  }, [slug])

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  async function save(e) {
    e.preventDefault()
    setMessage('')
    const problem = validate(values)
    if (problem) {
      setError(problem)
      return
    }

    const payload = {
      name: values.name.trim(),
      description: values.description,
      category: values.category ? Number(values.category) : null,
      brand: values.brand ? Number(values.brand) : null,
      price: values.price,
      discount_price: values.discount_price === '' ? null : values.discount_price,
      has_variants: values.has_variants,
    }
    if (!values.has_variants) payload.stock = Number(values.stock || 0)

    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const created = await api.post('/api/vendors/products/', payload)
        navigate(`/vendor/products/${created.slug}`, { replace: true, state: { created: true } })
        return
      }
      const updated = await api.patch(`/api/vendors/products/${slug}/`, payload)
      setProduct(updated)
      setValues(fromProduct(updated))
      setMessage('Changes saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function setActive(next) {
    if (next) {
      const warnings = []
      if (product.images.length === 0) warnings.push('This product has no images.')
      const hasStock = product.has_variants
        ? product.variants.some((v) => v.is_active && v.stock > 0)
        : product.stock > 0
      if (!hasStock) warnings.push('Nothing is in stock.')
      if (warnings.length && !window.confirm(`${warnings.join(' ')} Publish anyway?`)) return
    }

    setError('')
    setMessage('')
    try {
      setProduct(await api.patch(`/api/vendors/products/${slug}/`, { is_active: next }))
      setMessage(next ? 'Product published.' : 'Product unpublished.')
    } catch (err) {
      setError(err.message)
    }
  }

  if (notFound) {
    return (
      <>
        <p className="muted">Product not found.</p>
        <Link to="/vendor/products" className="link-button">
          ← Back to products
        </Link>
      </>
    )
  }
  if (loading) return <p className="muted">Loading product...</p>

  const parents = options.categories.filter((c) => !c.parent_id)
  const childrenOf = (id) => options.categories.filter((c) => c.parent_id === id)

  return (
    <>
      <Link to="/vendor/products" className="v-back">
        ← All products
      </Link>
      <div className="v-head">
        <h1>{isNew ? 'Add product' : product?.name}</h1>
        {!isNew && product && (
          <div className="v-actions">
            <span className={`pill ${product.is_active ? 'live' : 'draft'}`}>{product.is_active ? 'Live' : 'Draft'}</span>
            <button className="btn-small" onClick={() => setActive(!product.is_active)}>
              {product.is_active ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-info">{message}</p>}

      <form className="v-panel" onSubmit={save}>
        <h2>Product details</h2>
        <div className="form-grid">
          <label className="field span-2">
            Name
            <input value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={300} required />
          </label>
          <label className="field span-2">
            Description
            <textarea rows={4} value={values.description} onChange={(e) => set('description', e.target.value)} />
          </label>

          <label className="field">
            Category
            <select value={values.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">No category</option>
              {parents.map((parent) => [
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>,
                ...childrenOf(parent.id).map((child) => (
                  <option key={child.id} value={child.id}>
                    — {child.name}
                  </option>
                )),
              ])}
            </select>
          </label>
          <label className="field">
            Brand
            <select value={values.brand} onChange={(e) => set('brand', e.target.value)}>
              <option value="">No brand</option>
              {options.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Price (₹)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={values.price}
              onChange={(e) => set('price', e.target.value)}
              required
            />
          </label>
          <label className="field">
            Discount price (₹, optional)
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={values.discount_price}
              onChange={(e) => set('discount_price', e.target.value)}
            />
          </label>

          <label className="check-field span-2">
            <input
              type="checkbox"
              checked={values.has_variants}
              onChange={(e) => set('has_variants', e.target.checked)}
            />
            This product has variants (for example sizes or colours), each with its own stock
          </label>

          {!values.has_variants && (
            <label className="field">
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={values.stock}
                onChange={(e) => set('stock', e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="v-actions">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create product' : 'Save changes'}
          </button>
        </div>
      </form>

      {isNew && <p className="muted">After creating the product you can add images and variants.</p>}

      {!isNew && product && (
        <>
          <ProductImages product={product} onChanged={refreshProduct} />
          {product.has_variants ? (
            <ProductVariants product={product} attributeTypes={options.attribute_types} onChanged={refreshProduct} />
          ) : (
            <div className="v-panel">
              <h2>Variants</h2>
              <p className="muted">
                Tick "This product has variants" above and save to add sizes, colours or other options.
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}