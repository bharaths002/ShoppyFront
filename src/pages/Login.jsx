import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

const RESEND_SECONDS = 15 // matches the backend's resend cooldown

export default function Login() {
  const { login, isLoggedIn } = useAuth()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'

  const [tab, setTab] = useState('register') // 'register' | 'login'
  const [method, setMethod] = useState('password') // login tab only: 'password' | 'otp'
  const [step, setStep] = useState('email') // 'email' | 'verify' (otp flow only)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Register always uses OTP. Log in uses a password, or OTP when the user picks it.
  const otpFlow = tab === 'register' || method === 'otp'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  if (isLoggedIn) return <Navigate to={redirectTo} replace />

  // keeps the typed email so switching between flows doesn't lose it
  function resetForm() {
    setStep('email')
    setOtp('')
    setPassword('')
    setError('')
    setInfo('')
  }

  function switchTab(next) {
    setTab(next)
    setMethod('password')
    resetForm()
  }

  function switchMethod(next) {
    setMethod(next)
    resetForm()
  }

  async function sendOtp(e) {
    e?.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await api.post('/api/accounts/sendotp/', { email: email.trim() }, { auth: false })
      setInfo(data.message)
      setStep('verify')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      setError(err.message) // includes the rate-limit (429) messages
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post(
        '/api/accounts/verifyotp/',
        { email: email.trim(), otp: otp.trim() },
        { auth: false },
      )
      login(data, email.trim()) // the redirect happens once the user is set
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function passwordLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post(
        '/api/accounts/login/',
        { email: email.trim(), password },
        { auth: false },
      )
      login(data, email.trim())
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h2>Login or register</h2>
        <p className="auth-sub">New here? Verify your email with an OTP and we'll create your account.</p>

        <div className="auth-tabs">
          <button className={tab === 'register' ? 'active' : ''} onClick={() => switchTab('register')}>
            Register
          </button>
          <button className={tab === 'login' ? 'active' : ''} onClick={() => switchTab('login')}>
            Log in
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {info && !error && <p className="form-info">{info}</p>}

        {otpFlow && step === 'email' && (
          <form onSubmit={sendOtp}>
            <label className="field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            {tab === 'login' && (
              <div className="auth-footer">
                <button type="button" className="forgot-link link-button" onClick={() => switchMethod('password')}>
                  Log in with password instead
                </button>
              </div>
            )}
          </form>
        )}

        {otpFlow && step === 'verify' && (
          <form onSubmit={verifyOtp}>
            <p className="auth-sub">
              Enter the 6-digit code sent to <strong>{email}</strong>. It is valid for 5 minutes.
            </p>
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
            <button className="btn-primary" disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>

            <div className="auth-links">
              <button type="button" className="link-button" onClick={sendOtp} disabled={loading || cooldown > 0}>
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                  setError('')
                  setInfo('')
                }}
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {!otpFlow && (
          <form onSubmit={passwordLogin}>
            <label className="field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="field">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>

            <p className="or-divider">or</p>

            <button type="button" className="btn-secondary" onClick={() => switchMethod('otp')}>
              Login with OTP
            </button>

            <div className="auth-footer">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}