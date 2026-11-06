import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const RESEND_SECONDS = 15 // matches the backend's resend cooldown

export default function ForgotPassword() {
  const { isLoggedIn } = useAuth()

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // logged-in users change their password from the profile page instead
  if (isLoggedIn) return <Navigate to="/" replace />

  async function sendOtp(e) {
    e?.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      // purpose: 'reset' makes the backend refuse emails that have no account
      await api.post('/api/accounts/sendotp/', { email: email.trim(), purpose: 'reset' }, { auth: false })
      setOtpSent(true)
      setInfo('We sent a 6-digit OTP to your email. It is valid for 5 minutes.')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post(
        '/api/accounts/reset-password/',
        { email: email.trim(), otp: otp.trim(), password, confirm_password: confirmPassword },
        { auth: false },
      )
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function changeEmail() {
    setOtpSent(false)
    setOtp('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setInfo('')
  }

  if (done) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <h2>Password reset</h2>
          <p className="form-info">Your password has been reset. You can now log in with your new password.</p>
          <Link to="/login" className="btn-primary">
            Go to login
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h2>Reset your password</h2>
        <p className="auth-sub">Enter your registered email and we'll send you an OTP.</p>

        {error && <p className="form-error">{error}</p>}
        {info && !error && <p className="form-info">{info}</p>}

        <form onSubmit={otpSent ? resetPassword : sendOtp}>
          <label className="field">
            Registered email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              readOnly={otpSent}
              required
            />
          </label>

          {!otpSent && (
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          )}

          {otpSent && (
            <>
              <label className="field">
                OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  required
                />
              </label>
              <label className="field">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label className="field">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>

              <button className="btn-primary" disabled={loading || otp.length !== 6}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>

              <div className="auth-links">
                <button type="button" className="link-button" onClick={sendOtp} disabled={loading || cooldown > 0}>
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
                <button type="button" className="link-button" onClick={changeEmail}>
                  Change email
                </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-footer">
          <Link to="/login" className="forgot-link">
            ← Back to login
          </Link>
        </div>
      </div>
    </section>
  )
}