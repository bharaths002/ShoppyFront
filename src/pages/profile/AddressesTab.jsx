import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client'
import AddressForm from '../../components/AddressForm'

const MAX_ADDRESSES = 10 // same limit as the backend

function AddressCard({ address, busy, onEdit, onDelete, onSetDefault }) {
  const typeLabel = { both: 'Shipping & billing', shipping: 'Shipping', billing: 'Billing' }[address.address_type]

  return (
    <article className="address-card">
      <div className="address-top">
        <strong>{address.full_name}</strong>
        <div className="pills">
          {address.is_default && <span className="pill default">Default</span>}
          <span className="pill">{typeLabel}</span>
        </div>
      </div>

      <p>
        {address.address_line_1}
        {address.address_line_2 && `, ${address.address_line_2}`}
        <br />
        {address.city}, {address.state} {address.postal_code}
        <br />
        {address.country}
      </p>
      <p className="address-phone">Phone: {address.phone_number}</p>

      <div className="address-actions">
        <button className="btn-small" onClick={onEdit} disabled={busy}>
          Edit
        </button>
        {!address.is_default && (
          <button className="btn-small" onClick={onSetDefault} disabled={busy}>
            Set as default
          </button>
        )}
        <button className="btn-small danger" onClick={onDelete} disabled={busy}>
          Delete
        </button>
      </div>
    </article>
  )
}

export default function AddressesTab() {
  const [addresses, setAddresses] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | address id
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setAddresses(await api.get('/api/accounts/addresses/'))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openForm(target) {
    setFormError('')
    setEditing(target)
  }

  async function handleSave(payload) {
    setSubmitting(true)
    setFormError('')
    try {
      if (editing === 'new') await api.post('/api/accounts/addresses/', payload)
      else await api.patch(`/api/accounts/addresses/${editing}/`, payload)
      await load()
      setEditing(null)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function runAction(id, action) {
    setBusyId(id)
    setError('')
    try {
      await action()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function handleDelete(address) {
    if (!window.confirm('Delete this address?')) return
    runAction(address.id, () => api.del(`/api/accounts/addresses/${address.id}/`))
  }

  const atLimit = addresses && addresses.length >= MAX_ADDRESSES

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Saved addresses</h2>
          <p className="panel-sub">
            {addresses ? `${addresses.length} of ${MAX_ADDRESSES} saved` : 'Loading...'}
          </p>
        </div>
        {editing === null && (
          <button className="btn-primary add-button" onClick={() => openForm('new')} disabled={!addresses || atLimit}>
            + Add address
          </button>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      {editing === 'new' && (
        <div className="inline-form">
          <h3>New address</h3>
          <AddressForm
            submitting={submitting}
            error={formError}
            submitLabel="Save address"
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {addresses && addresses.length === 0 && editing !== 'new' && (
        <p className="muted">You haven't saved any addresses yet.</p>
      )}

      <div className="address-list">
        {addresses?.map((address) =>
          editing === address.id ? (
            <div className="inline-form" key={address.id}>
              <h3>Edit address</h3>
              <AddressForm
                initial={address}
                submitting={submitting}
                error={formError}
                submitLabel="Save changes"
                onSubmit={handleSave}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <AddressCard
              key={address.id}
              address={address}
              busy={busyId === address.id}
              onEdit={() => openForm(address.id)}
              onDelete={() => handleDelete(address)}
              onSetDefault={() => runAction(address.id, () => api.post(`/api/accounts/addresses/${address.id}/set-default/`))}
            />
          ),
        )}
      </div>
    </div>
  )
}