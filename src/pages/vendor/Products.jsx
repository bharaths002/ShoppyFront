import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'

const PLACEHOLDER = 'https://placehold.co/88x88?text=No+Image'
const DEFAULT_FILTERS = { search: '', active: '', page: 1 }

export default function VendorProducts() {
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busySlug, setBusySlug] = useState(null)

  // debounce the search box
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ page: filters.page, page_size: 10 })
    if (filters.search) params.set('search', filters.search)
    if (filters.active) params.set('is_active', filters.active)

    api
      .get(`/api/vendors/products/?${params}`, { signal: controller.signal })
      .then((res) => {
        setData(res)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })

    return () => controller.abort()
  }, [filters, reloadKey])

  async function toggleActive(product) {
    if (!product.is_active && !window.confirm('Publish this product? Customers will be able to buy it.')) return
    setBusySlug(product.slug)
    setError('')
    try {
      await api.patch(`/api/vendors/products/${product.slug}/`, { is_active: !product.is_active })
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <>
      <div className="v-head">
        <h1>Products</h1>
        <Link to="/vendor/products/new" className="shop-button">
          + Add product
        </Link>
      </div>

      <div className="v-toolbar">
        <input
          type="search"
          placeholder="Search your products"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value, page: 1 }))}>
          <option value="">All products</option>
          <option value="true">Live</option>
          <option value="false">Drafts</option>
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="muted">Loading products...</p>}

      {data && data.results.length === 0 && (
        <p className="muted">
          {filters.search || filters.active
            ? 'No products match these filters.'
            : 'You have no products yet. New products start as drafts until you publish them.'}
        </p>
      )}

      {data && data.results.length > 0 && (
        <div className="v-table-wrap">
          <table className="v-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="v-name">
                      <img className="v-thumb" src={p.primary_image || PLACEHOLDER} alt="" />
                      <Link to={`/vendor/products/${p.slug}`}>
                        <strong>{p.name}</strong>
                      </Link>
                    </div>
                  </td>
                  <td>
                    {formatPrice(p.effective_price)}
                    {Number(p.discount_percent) > 0 && <p className="muted">{p.discount_percent}% off</p>}
                  </td>
                  <td>{p.has_variants ? 'Per variant' : p.stock}</td>
                  <td>
                    <span className={`pill ${p.is_active ? 'live' : 'draft'}`}>{p.is_active ? 'Live' : 'Draft'}</span>
                  </td>
                  <td>
                    <div className="v-actions">
                      <Link to={`/vendor/products/${p.slug}`} className="btn-small">
                        Edit
                      </Link>
                      <button className="btn-small" onClick={() => toggleActive(p)} disabled={busySlug === p.slug}>
                        {p.is_active ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
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
    </>
  )
}