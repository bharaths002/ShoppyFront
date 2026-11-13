import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getInitial } from '../utils/format'
import './Navbar.css'

export default function Navbar() {
  const { user, isLoggedIn, isVendorApproved, logout } = useAuth()
  const { count } = useCart()
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
            {isVendorApproved && <Link to="/vendor">Vendor dashboard</Link>}
            <button className="link-button" onClick={handleLogout}>
              Logout
            </button>
            <Link to="/profile" className="avatar" title="My profile" aria-label="My profile">
              {getInitial(user)}
            </Link>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}

        <Link to="/cart" className="cart-button">
          Cart ({count})
        </Link>
      </div>
    </header>
  )
}