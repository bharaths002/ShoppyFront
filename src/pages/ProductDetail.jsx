import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import './ProductDetail.css'

const PLACEHOLDER = 'https://placehold.co/600x450?text=No+Image'

// "128GB / Black", or the SKU when a variant has no attributes
function variantLabel(v) {
  return v.attributes.map((a) => a.value).join(' / ') || v.sku
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [variantId, setVariantId] = useState(null)
  const [imageIndex, setImageIndex] = useState(null) // null = show the variant / primary image
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setProduct(null)
    setError('')
    setNotFound(false)
    setVariantId(null)
    setImageIndex(null)
    setQuantity(1)
    setMessage('')
    setAddError('')

    api
      .get(`/api/products/${slug}/`, { auth: false, signal: controller.signal })
      .then(setProduct)
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (err.status === 404) setNotFound(true)
        else setError(err.message)
      })

    return () => controller.abort()
  }, [slug])

  const variants = useMemo(() => (product?.variants || []).filter((v) => v.is_active), [product])

  if (notFound) {
    return (
      <section className="page-message">
        <h2>Product not found</h2>
        <p>It may have been removed or is no longer available.</p>
        <Link to="/" className="shop-button">
          Back to home
        </Link>
      </section>
    )
  }
  if (error) {
    return (
      <section className="detail-page">
        <p className="form-error">{error}</p>
      </section>
    )
  }
  if (!product) {
    return (
      <section className="detail-page">
        <p className="muted">Loading product...</p>
      </section>
    )
  }

  const selected = variants.find((v) => v.id === variantId) || null
  const needsVariant = product.has_variants
  const stock = needsVariant ? (selected ? selected.stock : 0) : product.stock
  const canAdd = needsVariant ? Boolean(selected) && selected.stock > 0 : product.stock > 0

  const price = selected ? selected.effective_price : product.effective_price
  const basePrice = selected ? (selected.price ?? product.price) : product.price
  const hasDiscount = Number(basePrice) > Number(price)
  const percent = hasDiscount ? Math.round((1 - Number(price) / Number(basePrice)) * 100) : 0

  const images = product.images || []
  const primary = images.find((i) => i.is_primary) || images[0]
  const mainImage =
    (imageIndex !== null ? images[imageIndex]?.image : selected?.image || primary?.image) || PLACEHOLDER

  let stockText = 'In stock'
  if (needsVariant && variants.length === 0) stockText = 'Currently unavailable'
  else if (needsVariant && !selected) stockText = 'Select an option'
  else if (stock <= 0) stockText = 'Out of stock'
  else if (stock <= 5) stockText = `Only ${stock} left`

  function chooseVariant(id) {
    setVariantId(id)
    setImageIndex(null)
    setQuantity(1)
    setMessage('')
    setAddError('')
  }

  async function handleAdd() {
    setAdding(true)
    setMessage('')
    setAddError('')
    try {
      await addItem({ productId: product.id, variantId: selected?.id, quantity })
      setMessage('Added to your cart.')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="detail-page">
      <p className="breadcrumb">
        <Link to="/">Home</Link>
        {product.category && <> / {product.category.name}</>}
      </p>

      <div className="detail-layout">
        <div className="gallery">
          <img className="gallery-main" src={mainImage} alt={product.name} />
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.map((img, i) => (
                <button key={img.id} className={imageIndex === i ? 'active' : ''} onClick={() => setImageIndex(i)}>
                  <img src={img.image} alt={img.alt_text || product.name} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          {product.brand && <p className="category">{product.brand.name}</p>}
          <h1>{product.name}</h1>
          {product.vendor && <p className="seller">Sold by {product.vendor.shop_name}</p>}

          <p className="detail-price">
            {formatPrice(price)}
            {hasDiscount && (
              <>
                <span className="old-price inline">{formatPrice(basePrice)}</span>
                <span className="badge static">{percent}% off</span>
              </>
            )}
          </p>

          {needsVariant && variants.length > 0 && (
            <div className="variant-block">
              <p className="variant-title">Choose an option</p>
              <div className="variant-options">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    className={`variant-chip ${v.id === variantId ? 'selected' : ''}`}
                    onClick={() => chooseVariant(v.id)}
                    disabled={v.stock <= 0}
                    title={v.attributes.map((a) => `${a.attribute_name}: ${a.value}`).join(', ')}
                  >
                    {variantLabel(v)}
                    {v.stock <= 0 && <small> (sold out)</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className={`stock-text ${stock > 0 && (!needsVariant || selected) ? 'ok' : ''}`}>{stockText}</p>

          <div className="buy-row">
            <div className="qty-stepper">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || !canAdd}>
                −
              </button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(stock, q + 1))} disabled={!canAdd || quantity >= stock}>
                +
              </button>
            </div>

            <button className="btn-primary add-to-cart" onClick={handleAdd} disabled={!canAdd || adding}>
              {needsVariant && !selected ? 'Select an option' : adding ? 'Adding...' : 'Add to cart'}
            </button>
          </div>

          {addError && <p className="form-error">{addError}</p>}
          {message && (
            <p className="form-info">
              {message} <Link to="/cart">View cart</Link>
            </p>
          )}

          {product.description && (
            <div className="description">
              <h2>About this product</h2>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}