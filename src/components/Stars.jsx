import './Reviews.css'

// read-only stars, rounded to the nearest whole star
export function Stars({ value }) {
  const filled = Math.round(Number(value) || 0)
  return (
    <span className="stars" role="img" aria-label={`${Number(value || 0).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? 'on' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

// clickable stars for the review form
export function StarInput({ value, onChange }) {
  return (
    <span className="star-input" role="group" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={n === value}
        >
          ★
        </button>
      ))}
    </span>
  )
}