import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'

const BUSINESS_TYPES = [
  { value: 'individual', label: 'Individual / Sole proprietor' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private limited company' },
  { value: 'public_limited', label: 'Public limited company' },
]

// same rules as the backend serializer
function validate(v) {
  if (v.shop_name.trim().length < 3) return 'Shop name must be at least 3 characters.'
  if (v.gstin && v.gstin.length !== 15) return 'GSTIN must be exactly 15 characters.'
  if (v.pan_number && v.pan_number.length !== 10) return 'PAN number must be exactly 10 characters.'
  if (!/^\d{10,15}$/.test(v.business_phone.trim().replace(/[\s-]/g, ''))) {
    return 'Business phone must be 10 to 15 digits.'
  }
  return ''
}

function ApplicationForm({ initial, defaultEmail, submitLabel, onSubmitted }) {
  const [values, setValues] = useState({
    shop_name: initial?.shop_name || '',
    shop_description: initial?.shop_description || '',
    business_type: initial?.business_type || 'individual',
    gstin: initial?.gstin || '',
    pan_number: initial?.pan_number || '',
    business_phone: initial?.business_phone || '',
    business_email: initial?.business_email || defaultEmail || '',
    business_address: initial?.business_address || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const message = validate(values)
    if (message) {
      setError(message)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const data = await api.post('/api/vendors/apply/', { ...values, shop_name: values.shop_name.trim() })
      onSubmitted(data.vendor_profile)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <div className="form-grid">
        <label className="field span-2">
          Shop name
          <input value={values.shop_name} onChange={(e) => set('shop_name', e.target.value)} maxLength={200} required />
        </label>
        <label className="field span-2">
          Shop description (optional)
          <textarea
            rows={3}
            value={values.shop_description}
            onChange={(e) => set('shop_description', e.target.value)}
          />
        </label>

        <label className="field span-2">
          Business type
          <select value={values.business_type} onChange={(e) => set('business_type', e.target.value)}>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          GSTIN (optional)
          <input value={values.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} maxLength={15} />
        </label>
        <label className="field">
          PAN number (optional)
          <input
            value={values.pan_number}
            onChange={(e) => set('pan_number', e.target.value.toUpperCase())}
            maxLength={10}
          />
        </label>

        <label className="field">
          Business phone
          <input
            type="tel"
            value={values.business_phone}
            onChange={(e) => set('business_phone', e.target.value)}
            maxLength={15}
            required
          />
        </label>
        <label className="field">
          Business email
          <input
            type="email"
            value={values.business_email}
            onChange={(e) => set('business_email', e.target.value)}
            required
          />
        </label>

        <label className="field span-2">
          Business address (optional)
          <textarea
            rows={3}
            value={values.business_address}
            onChange={(e) => set('business_address', e.target.value)}
          />
        </label>
      </div>

      <div className="profile-actions">
        <button className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default function SellerTab() {
  const { me, vendor, setVendor, reloadVendor } = useOutletContext()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  async function refresh() {
    setRefreshing(true)
    setRefreshError('')
    try {
      await reloadVendor()
    } catch (err) {
      setRefreshError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  if (vendor === undefined) return <p className="muted">Loading...</p>

  // never applied
  if (vendor === null) {
    return (
      <div className="panel">
        <h2>Sell on Shoppy</h2>
        <p className="panel-sub">
          Apply to open a shop on the same account you shop with. Our team reviews every application before you can
          list products.
        </p>
        <ApplicationForm defaultEmail={me.email} submitLabel="Submit application" onSubmitted={setVendor} />
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>{vendor.shop_name}</h2>

      {vendor.status === 'pending' && (
        <div className="status-card pending">
          <strong>Application under review</strong>
          <p>We'll approve it soon. Once approved, you can add products and manage orders.</p>
          <button className="btn-small" onClick={refresh} disabled={refreshing}>
            {refreshing ? 'Checking...' : 'Check status'}
          </button>
          {refreshError && <p className="form-error">{refreshError}</p>}
        </div>
      )}

      {vendor.status === 'approved' && (
        <div className="status-card approved">
          <strong>Your shop is approved</strong>
          <p>You can now manage products, inventory and orders from your vendor dashboard.</p>
          <Link to="/vendor" className="btn-small">
            Open vendor dashboard
          </Link>
        </div>
      )}

      {vendor.status === 'suspended' && (
        <div className="status-card suspended">
          <strong>Your shop is suspended</strong>
          <p>Your shop is hidden from customers. Please contact support to resolve this.</p>
        </div>
      )}

      {vendor.status === 'rejected' && (
        <>
          <div className="status-card rejected">
            <strong>Application not approved</strong>
            <p>Reason: {vendor.rejection_reason || 'No reason was given.'}</p>
            <p>You can update your details below and apply again.</p>
          </div>
          <ApplicationForm
            initial={vendor}
            defaultEmail={me.email}
            submitLabel="Resubmit application"
            onSubmitted={setVendor}
          />
        </>
      )}

      {(vendor.status === 'pending' || vendor.status === 'approved' || vendor.status === 'suspended') && (
        <dl className="detail-list">
          <dt>Business type</dt>
          <dd>{BUSINESS_TYPES.find((t) => t.value === vendor.business_type)?.label || vendor.business_type}</dd>
          <dt>Business email</dt>
          <dd>{vendor.business_email}</dd>
          <dt>Business phone</dt>
          <dd>{vendor.business_phone}</dd>
          {vendor.status === 'approved' && (
            <>
              <dt>Commission</dt>
              <dd>{vendor.commission_rate}% per sale</dd>
            </>
          )}
        </dl>
      )}
    </div>
  )
}