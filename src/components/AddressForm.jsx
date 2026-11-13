import { useState } from 'react'

// Reusable: the profile page uses it now, checkout will use it for "add a new address".

const EMPTY = {
  full_name: '',
  phone_number: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  address_type: 'both',
  is_default: false,
}

function fromAddress(a) {
  return {
    full_name: a.full_name,
    phone_number: a.phone_number,
    address_line_1: a.address_line_1,
    address_line_2: a.address_line_2 || '',
    city: a.city,
    state: a.state,
    postal_code: a.postal_code,
    country: a.country,
    address_type: a.address_type,
    is_default: a.is_default,
  }
}

// same rules as the backend serializers
function validate(v) {
  if (v.full_name.trim().length < 3) return 'Full name must be at least 3 characters.'
  if (!/^\d{10,15}$/.test(v.phone_number.trim().replace(/[\s-]/g, ''))) {
    return 'Phone number must be 10 to 15 digits.'
  }
  if (!/^\d{6}$/.test(v.postal_code.trim())) return 'Postal code must be 6 digits.'
  return ''
}

export default function AddressForm({ initial = null, submitting = false, error = '', submitLabel = 'Save address', onSubmit, onCancel }) {
  const editing = Boolean(initial)
  const [values, setValues] = useState(() => (initial ? fromAddress(initial) : EMPTY))
  const [localError, setLocalError] = useState('')

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const message = validate(values)
    if (message) {
      setLocalError(message)
      return
    }
    setLocalError('')

    const payload = { ...values }
    // When editing, never send is_default: false (that could leave the user with no default).
    if (editing && (initial.is_default || !values.is_default)) delete payload.is_default
    onSubmit(payload)
  }

  const shownError = localError || error

  return (
    <form onSubmit={handleSubmit}>
      {shownError && <p className="form-error">{shownError}</p>}

      <div className="form-grid">
        <label className="field">
          Full name
          <input value={values.full_name} onChange={(e) => set('full_name', e.target.value)} required />
        </label>
        <label className="field">
          Phone number
          <input
            type="tel"
            value={values.phone_number}
            onChange={(e) => set('phone_number', e.target.value)}
            maxLength={15}
            required
          />
        </label>

        <label className="field span-2">
          Address line 1
          <input value={values.address_line_1} onChange={(e) => set('address_line_1', e.target.value)} required />
        </label>
        <label className="field span-2">
          Address line 2 (optional)
          <input value={values.address_line_2} onChange={(e) => set('address_line_2', e.target.value)} />
        </label>

        <label className="field">
          City
          <input value={values.city} onChange={(e) => set('city', e.target.value)} required />
        </label>
        <label className="field">
          State
          <input value={values.state} onChange={(e) => set('state', e.target.value)} required />
        </label>

        <label className="field">
          Postal code
          <input
            inputMode="numeric"
            maxLength={6}
            value={values.postal_code}
            onChange={(e) => set('postal_code', e.target.value.replace(/\D/g, ''))}
            required
          />
        </label>
        <label className="field">
          Country
          <input value={values.country} onChange={(e) => set('country', e.target.value)} required />
        </label>

        <label className="field span-2">
          Use this address for
          <select value={values.address_type} onChange={(e) => set('address_type', e.target.value)}>
            <option value="both">Shipping and billing</option>
            <option value="shipping">Shipping only</option>
            <option value="billing">Billing only</option>
          </select>
        </label>
      </div>

      {!initial?.is_default && (
        <label className="check-field">
          <input type="checkbox" checked={values.is_default} onChange={(e) => set('is_default', e.target.checked)} />
          Set as my default address
        </label>
      )}

      <div className="profile-actions">
        <button className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}