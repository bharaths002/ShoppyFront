import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

// cartCount is wired up in the cart module
export default function Navbar({ cartCount = 0 }) {
  const { isLoggedIn, isVendorApproved, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link className="logo" to="/">
        Shoppy<span>.</span>
      </Link>

      <nav>
        <NavLink to="/" end>
          Home
        </NavLink>
        <Link to={{ pathname: '/', hash: '#products' }}>Products</Link>
        <a href="#footer">About</a>
      </nav>

      <div className="nav-actions">
        {isLoggedIn ? (
          <>
            <Link to="/profile">Profile</Link>
            {isVendorApproved && <Link to="/vendor">Vendor dashboard</Link>}
            <button className="link-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}

        <button className="cart-button">Cart ({cartCount})</button>
      </div>
    </header>
  )
}