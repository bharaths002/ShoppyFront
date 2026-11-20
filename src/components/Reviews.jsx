import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/format'
import ReviewForm from './ReviewForm'
import { Stars } from './Stars'
import './Reviews.css'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_helpful', label: 'Most helpful' },
  { value: 'highest_rated', label: 'Highest rated' },
  { value: 'lowest_rated', label: 'Lowest rated' },
]
const STAR_KEYS = { 5: 'five_star', 4: 'four_star', 3: 'three_star', 2: 'two_star', 1: 'one_star' }
const PAGE_SIZE = 5

// Reviews for one product: summary, filters, list, helpful votes and the write / edit form.
export default function Reviews({ productSlug }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [data, setData] = useState(null) // { summary, can_review, page, has_next }
  const [reviews, setReviews] = useState([])
  const [ordering, setOrdering] = useState('newest')
  const [rating, setRating] = useState('') // '' = all stars
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const [form, setForm] = useState(null) // null | { id?, initial? }
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchReviews = useCallback(
    async (page, signal) => {
      const params = new URLSearchParams({ ordering, page, page_size: PAGE_SIZE })
      if (rating) params.set('rating', rating)
      const url = `/api/reviews/${productSlug}/?${params}`
      try {
        return await api.get(url, { signal }) // logged in: the server also tells us which reviews are ours
      } catch (err) {
        // an expired login must not hide the reviews: show them as a guest instead
        if (err.status === 401) return api.get(url, { auth: false, signal })
        throw err
      }
    },
    [productSlug, ordering, rating],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchReviews(1, controller.signal)
      .then((res) => {
        setData(res)
        setReviews(res.reviews)
        setError('')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
    return () => controller.abort()
  }, [fetchReviews, reloadKey, isLoggedIn])

  const reload = () => setReloadKey((k) => k + 1)

  async function loadMore() {
    setLoadingMore(true)
    try {
      const res = await fetchReviews(data.page + 1)
      setData(res)
      setReviews((list) => [...list, ...res.reviews])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  function goToLogin() {
    navigate('/login', { state: { from: `${location.pathname}#reviews` } })
  }

  function openNew() {
    setNotice('')
    setFormError('')
    setForm({})
  }

  function openEdit(review) {
    setNotice('')
    setFormError('')
    setForm({ id: review.id, initial: { rating: review.rating, title: review.title || '', body: review.body } })
  }

  async function submitForm(values) {
    setSaving(true)
    setFormError('')
    try {
      if (form.id) await api.patch(`/api/reviews/${productSlug}/${form.id}/`, values)
      else await api.post(`/api/reviews/${productSlug}/`, values)
      setNotice(form.id ? 'Your review was updated.' : 'Thanks! Your review was posted.')
      setForm(null)
      reload()
    } catch (err) {
      setFormError(err.message) // e.g. "You can only review products you have purchased and received."
    } finally {
      setSaving(false)
    }
  }

  async function remove(review) {
    if (!window.confirm('Delete your review?')) return
    setBusyId(review.id)
    setError('')
    try {
      await api.del(`/api/reviews/${productSlug}/${review.id}/`)
      setNotice('Your review was deleted.')
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleHelpful(review) {
    if (!isLoggedIn) return goToLogin()
    setBusyId(review.id)
    setError('')
    try {
      const res = review.marked_helpful_by_me
        ? await api.del(`/api/reviews/helpful/${review.id}/`)
        : await api.post(`/api/reviews/helpful/${review.id}/`)
      setReviews((list) =>
        list.map((r) =>
          r.id === review.id
            ? { ...r, helpful_count: res.helpful_count, marked_helpful_by_me: !review.marked_helpful_by_me }
            : r,
        ),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const summary = data?.summary
  const total = summary?.total_reviews || 0
  const hasMine = reviews.some((r) => r.is_mine)
  // can_review comes from the server (bought and received, not reviewed yet). If it is missing, let the server decide on submit.
  const canWrite = data?.can_review !== false

  return (
    <section id="reviews" className="reviews">
      <h2>Customer reviews</h2>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-info">{notice}</p>}
      {!data && !error && <p className="muted">Loading reviews...</p>}

      {data && (
        <>
          <div className="review-top">
            <div className="review-score">
              <p className="big">{Number(summary.average_rating).toFixed(1)}</p>
              <Stars value={summary.average_rating} />
              <p className="muted">
                {total} review{total === 1 ? '' : 's'}
              </p>
            </div>

            <div className="review-bars">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = summary[STAR_KEYS[n]] || 0
                const active = rating === String(n)
                return (
                  <button
                    key={n}
                    className={`bar-row ${active ? 'active' : ''}`}
                    onClick={() => setRating(active ? '' : String(n))}
                    disabled={count === 0 && !active}
                    aria-label={`Show ${n} star reviews`}
                  >
                    <span>{n} ★</span>
                    <span className="bar">
                      <span style={{ width: total ? `${(count / total) * 100}%` : '0%' }} />
                    </span>
                    <span className="count">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="review-cta">
              {!isLoggedIn ? (
                <button className="btn-small" onClick={goToLogin}>
                  Log in to write a review
                </button>
              ) : canWrite ? (
                !form && (
                  <button className="btn-primary" onClick={openNew}>
                    Write a review
                  </button>
                )
              ) : (
                <p className="muted">
                  {hasMine
                    ? "You've reviewed this product. You can edit your review below."
                    : 'Only customers who have received this product can review it.'}
                </p>
              )}
            </div>
          </div>

          {form && (
            <ReviewForm
              key={form.id ?? 'new'}
              title={form.id ? 'Edit your review' : 'Write a review'}
              initial={form.initial}
              saving={saving}
              error={formError}
              submitLabel={form.id ? 'Save changes' : 'Post review'}
              onSubmit={submitForm}
              onCancel={() => setForm(null)}
            />
          )}

          <div className="review-toolbar">
            <span className="muted">
              {rating ? (
                <>
                  Showing {rating}-star reviews ·{' '}
                  <button className="link-button" onClick={() => setRating('')}>
                    Show all
                  </button>
                </>
              ) : (
                `${total} review${total === 1 ? '' : 's'}`
              )}
            </span>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value)} aria-label="Sort reviews">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {reviews.length === 0 ? (
            <p className="muted">
              {rating ? 'No reviews with this rating.' : 'No reviews yet. Be the first to review this product.'}
            </p>
          ) : (
            <ul className="review-list">
              {reviews.map((r) => (
                <li key={r.id} className="review">
                  <div className="review-head">
                    <Stars value={r.rating} />
                    {r.title && <strong>{r.title}</strong>}
                  </div>
                  <p className="review-meta">
                    {r.reviewer_name || 'Customer'} · {formatDate(r.created_at)}
                    {r.is_verified_purchase && <span className="verified">Verified purchase</span>}
                  </p>
                  <p className="review-body">{r.body}</p>

                  <div className="review-actions">
                    {r.is_mine ? (
                      <>
                        <button className="btn-small" onClick={() => openEdit(r)} disabled={busyId === r.id}>
                          Edit
                        </button>
                        <button className="btn-small danger" onClick={() => remove(r)} disabled={busyId === r.id}>
                          Delete
                        </button>
                        <span className="muted">{r.helpful_count} found this helpful</span>
                      </>
                    ) : (
                      <button
                        className={`helpful ${r.marked_helpful_by_me ? 'on' : ''}`}
                        onClick={() => toggleHelpful(r)}
                        disabled={busyId === r.id}
                      >
                        {r.marked_helpful_by_me ? '✓ ' : ''}Helpful ({r.helpful_count})
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.has_next && (
            <button className="btn-secondary load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Show more reviews'}
            </button>
          )}
        </>
      )}
    </section>
  )
}