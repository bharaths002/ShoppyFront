import { useRef, useState } from 'react'
import { api } from '../../api/client'

export default function ProductImages({ product, onChanged }) {
  const [files, setFiles] = useState([])
  const [alt, setAlt] = useState('')
  const [primary, setPrimary] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  async function upload(e) {
    e.preventDefault()
    if (files.length === 0) {
      setError('Choose at least one image.')
      return
    }

    const form = new FormData()
    files.forEach((file) => form.append('images', file)) // the backend reads every file under the key "images"
    form.append('is_primary', primary ? 'true' : 'false') // applies to the first image of this upload
    if (alt.trim()) form.append('alt_text', alt.trim())

    setUploading(true)
    setError('')
    try {
      await api.post(`/api/vendors/products/${product.slug}/images/`, form)
      setFiles([])
      setAlt('')
      setPrimary(false)
      if (inputRef.current) inputRef.current.value = ''
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function remove(image) {
    if (!window.confirm('Delete this image?')) return
    setBusyId(image.id)
    setError('')
    try {
      await api.del(`/api/vendors/products/${product.slug}/images/${image.id}/`)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="v-panel">
      <h2>Images</h2>
      {error && <p className="form-error">{error}</p>}

      {product.images.length === 0 ? (
        <p className="muted">No images yet. Products with photos sell better.</p>
      ) : (
        <div className="img-grid">
          {product.images.map((img) => (
            <div className="img-tile" key={img.id}>
              <img src={img.image} alt={img.alt_text || product.name} />
              {img.is_primary && <span className="pill">Main</span>}
              <button className="btn-small danger" onClick={() => remove(img)} disabled={busyId === img.id}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={upload}>
        <label className="field">
          Add images
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
        </label>
        <label className="field">
          Description for screen readers (optional)
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} />
        </label>
        <label className="check-field">
          <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
          Make the first image the main image
        </label>
        <div className="v-actions">
          <button className="btn-secondary" disabled={uploading || files.length === 0}>
            {uploading ? 'Uploading...' : `Upload ${files.length || ''} image${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </form>
    </div>
  )
}