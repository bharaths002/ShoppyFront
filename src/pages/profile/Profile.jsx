import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { getDisplayName, getInitial } from '../../utils/format'
import './Profile.css'

// the small version of the vendor profile that the navbar needs
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

// Layout for /profile/*: header, tabs, and the data every tab shares.
export default function Profile() {
  const { updateUser } = useAuth()
  const [me, setMe] = useState(null)
  const [vendor, setVendor] = useState(undefined) // undefined = loading, null = never applied
  const [error, setError] = useState('')

  const reloadVendor = useCallback(async () => {
    try {
      setVendor(await api.get('/api/vendors/profile/'))
    } catch (err) {
      if (err.status === 403) setVendor(null) // the backend answers 403 when there is no application
      else throw err
    }
  }, [])

  useEffect(() => {
    api.get('/api/accounts/me/').then(setMe).catch((err) => setError(err.message))
    reloadVendor().catch((err) => setError(err.message))
  }, [reloadVendor])

  // keep the navbar (initial + vendor link) in sync with fresh server data
  useEffect(() => {
    if (me) updateUser({ first_name: me.first_name })
  }, [me, updateUser])

  useEffect(() => {
    if (vendor !== undefined) updateUser({ vendor_profile: vendorSummary(vendor) })
  }, [vendor, updateUser])

  if (!me) {
    return error ? (
      <section className="profile-wrap">
        <p className="form-error">{error}</p>
      </section>
    ) : (
      <section className="profile-wrap">
        <p className="muted">Loading your profile...</p>
      </section>
    )
  }

  return (
    <section className="profile-wrap">
      <div className="profile-header">
        <div className="avatar avatar-lg">{getInitial(me)}</div>
        <div>
          <h1>{getDisplayName(me)}</h1>
          <p>{me.email || me.phone_number}</p>
        </div>
      </div>

      <nav className="profile-tabs">
        <NavLink to="details">Details</NavLink>
        <NavLink to="password">Password</NavLink>
        <NavLink to="addresses">Addresses</NavLink>
        <NavLink to="seller">Sell on Shoppy</NavLink>
      </nav>

      {error && <p className="form-error">{error}</p>}
      <Outlet context={{ me, setMe, vendor, setVendor, reloadVendor }} />
    </section>
  )
}