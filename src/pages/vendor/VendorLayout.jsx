import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { getInitial } from '../../utils/format'
import './Vendor.css'

// the small version of the vendor profile that the shop navbar needs
function vendorSummary(v) {
  if (!v) return null
  return {
    shop_name: v.shop_name,
    shop_slug: v.shop_slug,
    status: v.status,
    is_active: v.is_active,
    rejection_reason: v.status === 'rejected' ? v.rejection_reason : null,
  }
}

const GATE_TEXT = {
  pending: 'Your application is still under review. You can open the dashboard once it is approved.',
  rejected: 'Your application was not approved. You can update it and apply again from your profile.',
  suspended: 'Your shop is suspended. Please contact support.',
}

// Own layout (sidebar + header), separate from the shop navbar.
// It asks the server for the vendor status every time, so an approval is picked up without logging in again.
export default function VendorLayout() {
  const { user, updateUser } = useAuth()
  const [vendor, setVendor] = useState(undefined) // undefined = loading, null = never applied
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/vendors/profile/')
      .then(setVendor)
      .catch((err) => {
        if (err.status === 403) setVendor(null) // the backend answers 403 when there is no application
        else setError(err.message)
      })
  }, [])

  useEffect(() => {
    if (vendor !== undefined) updateUser({ vendor_profile: vendorSummary(vendor) })
  }, [vendor, updateUser])

  if (error) {
    return (
      <section className="gate">
        <p className="form-error">{error}</p>
        <Link to="/" className="shop-button">
          Back to store
        </Link>
      </section>
    )
  }
  if (vendor === undefined) {
    return (
      <section className="gate">
        <p className="muted">Loading your shop...</p>
      </section>
    )
  }

  if (!vendor || vendor.status !== 'approved') {
    return (
      <section className="gate">
        <h2>{vendor ? 'Dashboard not available yet' : "You're not a seller yet"}</h2>
        <p className="muted">
          {vendor ? GATE_TEXT[vendor.status] : 'Apply from your profile to start selling on Shoppy.'}
        </p>
        <Link to="/profile/seller" className="shop-button">
          {vendor ? 'View application' : 'Apply to sell'}
        </Link>
      </section>
    )
  }

  return (
    <div className="vendor-shell">
      <header className="vendor-top">
        <Link className="logo" to="/vendor">
          Shoppy<span>.</span> <small>Seller</small>
        </Link>
        <div className="vendor-top-right">
          <span>{vendor.shop_name}</span>
          <Link to="/">← Back to store</Link>
          <Link to="/profile" className="avatar" title="My profile" aria-label="My profile">
            {getInitial(user)}
          </Link>
        </div>
      </header>

      <div className="vendor-body">
        <nav className="vendor-side">
          <NavLink to="/vendor" end>
            Dashboard
          </NavLink>
          <NavLink to="/vendor/products">Products</NavLink>
          <NavLink to="/vendor/inventory">Inventory</NavLink>
          <NavLink to="/vendor/orders">Orders</NavLink>
          <NavLink to="/vendor/settings">Shop settings</NavLink>
        </nav>

        <main className="vendor-content">
          <Outlet context={{ vendor }} />
        </main>
      </div>
    </div>
  )
}