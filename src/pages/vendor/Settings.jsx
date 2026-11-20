import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { capitalize, formatDate } from '../../utils/format'

export default function VendorSettings() {
  const [vendor, setVendor] = useState(null)
  const [form, setForm] = useState(null)
  const [logo, setLogo] = useState(null)
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function applyVendor(data) {
    setVendor(data)
    setForm({
      shop_description: data.shop_description || '',
      business_phone: data.business_phone || '',
      business_email: data.business_email || '',
      business_address: data.business_address || '',
    })
  }

  useEffect(() => {
    api
      .get('/api/vendors/profile/')
      .then(applyVendor)
      .catch((err) => setError(err.message))
  }, [])

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function save(e) {
    e.preventDefault()
    setMessage('')
    if (!/^\d{10,15}$/.test(form.business_phone.trim().replace(/[\s-]/g, ''))) {
      setError('Business phone must be 10 to 15 digits.')
      return
    }

    // multipart: the logo and banner are files
    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => body.append(key, value))
    if (logo) body.append('logo', logo)
    if (banner) body.append('banner', banner)

    setSaving(true)
    setError('')
    try {
      applyVendor(await api.patch('/api/vendors/profile/', body))
      setLogo(null)
      setBanner(null)
      setMessage('Shop settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!form && error) return <p className="form-error">{error}</p>
  if (!form) return <p className="muted">Loading settings...</p>

  const logoSrc = logo ? URL.createObjectURL(logo) : vendor.logo
  const bannerSrc = banner ? URL.createObjectURL(banner) : vendor.banner

  return (
    <>
      <div className="v-head">
        <h1>Shop settings</h1>
      </div>

      <div className="v-panel">
        <h2>Shop details</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          These can only be changed by the platform team.
        </p>
        <dl className="detail-list">
          <dt>Shop name</dt>
          <dd>{vendor.shop_name}</dd>
          <dt>Shop link</dt>
          <dd>{vendor.shop_slug}</dd>
          <dt>Status</dt>
          <dd>{capitalize(vendor.status)}</dd>
          <dt>Commission</dt>
          <dd>{vendor.commission_rate}% per sale</dd>
          <dt>GSTIN</dt>
          <dd>{vendor.gstin || '—'}</dd>
          <dt>PAN</dt>
          <dd>{vendor.pan_number || '—'}</dd>
          <dt>Member since</dt>
          <dd>{formatDate(vendor.created_at)}</dd>
        </dl>
      </div>

      <form className="v-panel" onSubmit={save}>
        <h2>Public profile and contact</h2>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-info">{message}</p>}

        <div className="form-grid">
          <div className="field">
            Logo
            {logoSrc && <img className="logo-preview" src={logoSrc} alt="Shop logo" />}
            <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0] || null)} />
          </div>
          <div className="field">
            Banner
            {bannerSrc && <img className="banner-preview" src={bannerSrc} alt="Shop banner" />}
            <input type="file" accept="image/*" onChange={(e) => setBanner(e.target.files[0] || null)} />
          </div>

          <label className="field span-2">
            Shop description
            <textarea rows={4} value={form.shop_description} onChange={(e) => set('shop_description', e.target.value)} />
          </label>
          <label className="field">
            Business phone
            <input type="tel" value={form.business_phone} onChange={(e) => set('business_phone', e.target.value)} maxLength={15} required />
          </label>
          <label className="field">
            Business email
            <input type="email" value={form.business_email} onChange={(e) => set('business_email', e.target.value)} required />
          </label>
          <label className="field span-2">
            Business address
            <textarea rows={3} value={form.business_address} onChange={(e) => set('business_address', e.target.value)} />
          </label>
        </div>

        <div className="v-actions">
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </>
  )
}