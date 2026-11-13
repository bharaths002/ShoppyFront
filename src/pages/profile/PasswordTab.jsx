import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../../api/client'

export default function PasswordTab() {
  const { me, setMe } = useOutletContext()
  const hasPassword = me.has_password

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const body = { password, confirm_password: confirm }
      // Sent for accounts that already have a password. The backend starts checking it
      // once the SetPasswordView change is made; until then it is ignored.
      if (hasPassword) body.current_password = current

      await api.post('/api/accounts/set-password/', body)
      setMe({ ...me, has_password: true })
      setCurrent('')
      setPassword('')
      setConfirm('')
      setMessage(hasPassword ? 'Password changed.' : 'Password set. You can now log in with your email and password.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <h2>{hasPassword ? 'Change password' : 'Set a password'}</h2>
      <p className="panel-sub">
        {hasPassword
          ? 'Use at least 8 characters.'
          : 'You currently log in with an OTP. Set a password to also log in with your email and password.'}
      </p>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-info">{message}</p>}

      <form onSubmit={save} className="narrow-form">
        {hasPassword && (
          <label className="field">
            Current password
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
        )}
        <label className="field">
          New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        <label className="field">
          Confirm new password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        </label>

        <div className="profile-actions">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : hasPassword ? 'Change password' : 'Set password'}
          </button>
        </div>
      </form>
    </div>
  )
}