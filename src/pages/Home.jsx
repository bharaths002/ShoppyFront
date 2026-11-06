import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
import './Home.css'

const PAGE_SIZE = 8

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
]

const DEFAULT_FILTERS = { search: '', category: '', brand: '', ordering: 'newest', page: 1 }

function ProductSection({ id, eyebrow, title, products }) {
  if (!products.length) return null
  return (
    <section id={id} className="products-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const location = useLocation()

  const [featured, setFeatured] = useState([])
  const [arrivals, setArrivals] = useState([])
  const [options, setOptions] = useState({ categories: [], brands: [] })

  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // one-time loads: featured, new arrivals, filter options
  useEffect(() => {
    api.get('/api/products/featured/', { auth: false }).then(setFeatured).catch(() => {})
    api.get('/api/products/new-arrivals/', { auth: false }).then(setArrivals).catch(() => {})
    api.get('/api/products/filters/', { auth: false }).then(setOptions).catch(() => {})
  }, [])

  // debounce the search box
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // product list reloads whenever a filter or the page changes
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: filters.page,
      page_size: PAGE_SIZE,
      ordering: filters.ordering,
    })
    if (filters.search) params.set('search', filters.search)
    if (filters.category) params.set('category', filters.category)
    if (filters.brand) params.set('brand', filters.brand)

    setLoading(true)
    setError('')
    api
      .get(`/api/products/?${params}`, { auth: false, signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [filters])

  // "Products" link in the navbar points to /#products
  useEffect(() => {
    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.hash])

  function updateFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value, page: 1 }))
  }

  function changePage(page) {
    setFilters((f) => ({ ...f, page }))
    document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })
  }

  function clearFilters() {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }

  const filtering =
    filters.search || filters.category || filters.brand || filters.ordering !== 'newest' || filters.page > 1

  const parents = options.categories.filter((c) => !c.parent_id)
  const childrenOf = (id) => options.categories.filter((c) => c.parent_id === id)

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">YOUR EVERYDAY MARKETPLACE</p>
          <h1>Discover products you'll love.</h1>
          <p className="hero-description">
            Find your favorites, explore new arrivals, and shop everything you need in one place.
          </p>
          <a href="#products" className="shop-button">
            Explore products
          </a>
        </div>
      </section>

      {!filtering && (
        <>
          <ProductSection id="featured" eyebrow="HANDPICKED" title="Featured products" products={featured} />
          <ProductSection id="new-arrivals" eyebrow="JUST IN" title="New arrivals" products={arrivals} />
        </>
      )}

      <section id="products" className="products-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OUR COLLECTION</p>
            <h2>All products</h2>
          </div>
          {data && <p>{data.count} products</p>}
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder="Search products, brands or shops"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {parents.map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.slug}>All {parent.name}</option>
                {childrenOf(parent.id).map((child) => (
                  <option key={child.id} value={child.slug}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <select value={filters.brand} onChange={(e) => updateFilter('brand', e.target.value)}>
            <option value="">All brands</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>

          <select value={filters.ordering} onChange={(e) => updateFilter('ordering', e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {filtering && (
            <button className="link-button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && !data && <p className="muted">Loading products...</p>}

        {data && (
          <div className={loading ? 'product-grid is-loading' : 'product-grid'}>
            {data.results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {data && data.results.length === 0 && !loading && (
          <p className="muted">No products match these filters. Try clearing them.</p>
        )}

        {data && data.total_pages > 1 && (
          <div className="pagination">
            <button disabled={!data.has_previous || loading} onClick={() => changePage(filters.page - 1)}>
              Previous
            </button>
            <span>
              Page {data.page} of {data.total_pages}
            </span>
            <button disabled={!data.has_next || loading} onClick={() => changePage(filters.page + 1)}>
              Next
            </button>
          </div>
        )}
      </section>
    </>
  )
}