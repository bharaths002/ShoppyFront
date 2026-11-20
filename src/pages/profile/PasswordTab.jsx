import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, tokenStore } from '../../api/client'

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
    if (hasPassword && password === current) {
      setError('Your new password must be different from the current one.')
      return
    }

    setSaving(true)
    try {
      const body = { password, confirm_password: confirm }
      if (hasPassword) body.current_password = current // accounts that already have a password must prove they know it

      const res = await api.post('/api/accounts/set-password/', body)

      // the server signs out every older login and returns a fresh pair for this browser
      if (res?.access && res?.refresh) tokenStore.setTokens(res.access, res.refresh)

      setMe({ ...me, has_password: true })
      setCurrent('')
      setPassword('')
      setConfirm('')
      setMessage(
        hasPassword
          ? 'Password changed. Your other devices have been signed out.'
          : 'Password set. You can now log in with your email and password.',
      )
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
          ? 'Enter your current password, then choose a new one of at least 8 characters.'
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

      {hasPassword && (
        <p className="panel-sub" style={{ marginTop: 20 }}>
          Forgot your current password? Log out and use "Forgot password" on the login page.
        </p>
      )}
    </div>
  )
}