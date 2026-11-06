import { Link, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'

import './App.css'

function Footer() {
  return (
    <footer id="footer">
      <p>© 2026 Shoppy. Your everyday marketplace.</p>
    </footer>
  )
}

// Full navbar + footer: home, products, profile, cart...
function MainLayout() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// Minimal header: back arrow + centred logo. Used for login (and checkout later).
function AuthLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 'default' means the user opened this page directly, so there is nothing to go back to
  function goBack() {
    navigate(location.key !== 'default' ? -1 : '/')
  }

  return (
    <div className="app">
      <header className="auth-header">
        <button className="back-button" onClick={goBack} aria-label="Go back">
          ←
        </button>
        <Link className="logo" to="/">
          Shoppy<span>.</span>
        </Link>
      </header>

      <main className="auth-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function NotFound() {
  return (
    <section className="page-message">
      <h2>Page not found</h2>
      <p>This page doesn't exist yet.</p>
      <Link to="/" className="shop-button">
        Back to home
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
    </Routes>
  )
}