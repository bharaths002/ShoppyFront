import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'

const PLACEHOLDER = 'https://placehold.co/300x220?text=No+Image'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [state, setState] = useState('idle') // idle | adding | added
  const [error, setError] = useState('')

  const hasDiscount = Number(product.discount_percent) > 0
  const detailPath = `/products/${product.slug}`
  const label = [product.category?.name, product.brand?.name].filter(Boolean).join(' · ')
  const needsOptions = Boolean(product.has_variants)

  async function handleAdd() {
    if (needsOptions) {
      navigate(detailPath) // variants must be chosen on the detail page
      return
    }

    setState('adding')
    setError('')
    try {
      await addItem({ productId: product.id, quantity: 1 })
      setState('added')
      setTimeout(() => setState('idle'), 1500)
    } catch (err) {
      setState('idle')
      // the list response may not say whether a product has variants: fall back to the detail page
      if (err.data?.variant_id) {
        navigate(detailPath)
        return
      }
      setError(err.message)
    }
  }

  let buttonText = 'Add to cart'
  if (!product.is_in_stock) buttonText = 'Out of stock'
  else if (needsOptions) buttonText = 'Select options'
  else if (state === 'adding') buttonText = 'Adding...'
  else if (state === 'added') buttonText = 'Added ✓'

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-image">
        <img src={product.primary_image || PLACEHOLDER} alt={product.name} loading="lazy" />
        {hasDiscount && <span className="badge">{product.discount_percent}% off</span>}
      </Link>

      <div className="product-info">
        <p className="category">{label || 'General'}</p>
        <h3>
          <Link to={detailPath}>{product.name}</Link>
        </h3>
        {product.vendor && <p className="seller">Sold by {product.vendor.shop_name}</p>}

        <div className="product-bottom">
          <p className="price">
            {formatPrice(product.effective_price)}
            {hasDiscount && <span className="old-price">{formatPrice(product.price)}</span>}
          </p>

          <button onClick={handleAdd} disabled={!product.is_in_stock || state === 'adding'}>
            {buttonText}
          </button>
        </div>

        {error && <p className="card-error">{error}</p>}
      </div>
    </article>
  )
}