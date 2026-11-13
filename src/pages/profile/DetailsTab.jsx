import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'

export default function DetailsTab() {
  const { me, setMe } = useOutletContext()
  const [firstName, setFirstName] = useState(me.first_name || '')
  const [lastName, setLastName] = useState(me.last_name || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const unchanged =
    firstName.trim() === (me.first_name || '') && lastName.trim() === (me.last_name || '')

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const data = await api.patch('/api/accounts/me/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      setMe(data)
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
      setMessage('Details saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <h2>Personal details</h2>
      <p className="panel-sub">Your email and phone are used to log in, so they can't be changed here.</p>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-info">{message}</p>}

      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field">
            First name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={150} />
          </label>
          <label className="field">
            Last name
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={150} />
          </label>
          <label className="field">
            Email
            <input value={me.email || '—'} readOnly />
          </label>
          <label className="field">
            Phone
            <input value={me.phone_number || '—'} readOnly />
          </label>
        </div>

        <div className="profile-actions">
          <button className="btn-primary" disabled={saving || unchanged}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}