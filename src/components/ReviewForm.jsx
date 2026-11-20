import { useState } from 'react'
import { StarInput } from './Stars'
import './Reviews.css'

// Write or edit a review. Used on the product page and in the profile's "My reviews" tab.
export default function ReviewForm({
  title = 'Write a review',
  initial,
  saving = false,
  error = '',
  submitLabel = 'Post review',
  onSubmit,
  onCancel,
}) {
  const [rating, setRating] = useState(initial?.rating || 0)
  const [heading, setHeading] = useState(initial?.title || '')
  const [body, setBody] = useState(initial?.body || '')
  const [localError, setLocalError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!rating) return setLocalError('Please choose a star rating.')
    if (body.trim().length < 10) return setLocalError('Your review must be at least 10 characters.')
    setLocalError('')
    onSubmit({ rating, title: heading.trim(), body: body.trim() })
  }

  const shownError = localError || error

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {shownError && <p className="form-error">{shownError}</p>}

      <StarInput value={rating} onChange={setRating} />
      <label className="field">
        Title (optional)
        <input value={heading} maxLength={150} onChange={(e) => setHeading(e.target.value)} />
      </label>
      <label className="field">
        Your review
        <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
      </label>

      <div className="review-actions">
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}