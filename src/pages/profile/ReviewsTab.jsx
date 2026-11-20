import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import ReviewForm from '../../components/ReviewForm'
import { Stars } from '../../components/Stars'
import { formatDate } from '../../utils/format'

export default function ReviewsTab() {
  const [reviews, setReviews] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [formError, setFormError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api
      .get('/api/reviews/my-reviews/')
      .then(setReviews)
      .catch((err) => setError(err.message))
  }, [reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  async function save(review, values) {
    setSaving(true)
    setFormError('')
    try {
      await api.patch(`/api/reviews/${review.product_slug}/${review.id}/`, values)
      setEditingId(null)
      setNotice('Your review was updated.')
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(review) {
    if (!window.confirm('Delete this review?')) return
    setBusyId(review.id)
    setError('')
    setNotice('')
    try {
      await api.del(`/api/reviews/${review.product_slug}/${review.id}/`)
      setNotice('Your review was deleted.')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="panel">
      <h2>My reviews</h2>
      <p className="panel-sub">Edit or delete the reviews you've written. To review something new, open it from a delivered order.</p>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-info">{notice}</p>}
      {!reviews && !error && <p className="muted">Loading your reviews...</p>}
      {reviews && reviews.length === 0 && (
        <p className="muted">You haven't written any reviews yet. Once an order is delivered, you can review its products from the order page.</p>
      )}

      {reviews && reviews.length > 0 && (
        <ul className="review-list">
          {reviews.map((r) => (
            <li className="review" key={r.id}>
              {editingId === r.id ? (
                <ReviewForm
                  title={`Edit your review of ${r.product_name || 'this product'}`}
                  initial={{ rating: r.rating, title: r.title || '', body: r.body }}
                  saving={saving}
                  error={formError}
                  submitLabel="Save changes"
                  onSubmit={(values) => save(r, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="review-head">
                    <Stars value={r.rating} />
                    {r.title && <strong>{r.title}</strong>}
                  </div>
                  <p className="review-meta">
                    {r.product_slug ? (
                      <Link to={`/products/${r.product_slug}#reviews`}>{r.product_name || 'View product'}</Link>
                    ) : (
                      'Product'
                    )}{' '}
                    · {formatDate(r.created_at)} · {r.helpful_count} found this helpful
                  </p>
                  <p className="review-body">{r.body}</p>

                  {r.product_slug && (
                    <div className="review-actions">
                      <button
                        className="btn-small"
                        onClick={() => {
                          setFormError('')
                          setNotice('')
                          setEditingId(r.id)
                        }}
                        disabled={busyId === r.id}
                      >
                        Edit
                      </button>
                      <button className="btn-small danger" onClick={() => remove(r)} disabled={busyId === r.id}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}