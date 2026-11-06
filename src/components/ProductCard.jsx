import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/format'

const PLACEHOLDER = 'https://placehold.co/300x220?text=No+Image'

// onAddToCart is wired up in the cart module
export default function ProductCard({ product, onAddToCart }) {
  const hasDiscount = Number(product.discount_percent) > 0
  const detailPath = `/products/${product.slug}`
  const label = [product.category?.name, product.brand?.name].filter(Boolean).join(' · ')

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

          <button onClick={() => onAddToCart?.(product)} disabled={!product.is_in_stock}>
            {product.is_in_stock ? 'Add to cart' : 'Out of stock'}
          </button>
        </div>
      </div>
    </article>
  )
}