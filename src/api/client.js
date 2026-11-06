// Single place that talks to the Django API.
// - attaches the JWT access token
// - refreshes it on 401 (one refresh at a time, because refresh tokens are rotated + blacklisted)
// - turns every backend error shape into one readable message

const BASE_URL = import.meta.env.VITE_API_URL || ''
// Same origin (Vite proxy) -> default cookie handling. Direct cross-origin -> must opt in.
const CREDENTIALS = BASE_URL ? 'include' : 'same-origin'

const KEYS = {
  access: 'shoppy_access',
  refresh: 'shoppy_refresh',
  user: 'shoppy_user',
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(KEYS.access),
  getRefresh: () => localStorage.getItem(KEYS.refresh),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.user))
    } catch {
      return null
    }
  },
  setTokens: (access, refresh) => {
    localStorage.setItem(KEYS.access, access)
    if (refresh) localStorage.setItem(KEYS.refresh, refresh)
  },
  setUser: (user) => localStorage.setItem(KEYS.user, JSON.stringify(user)),
  clear: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
}

// Backend errors come as {error}, {detail}, {field: [msgs]} or plain text.
export function getErrorMessage(data) {
  const fallback = 'Something went wrong. Please try again.'
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.error) return String(data.error)
  if (data.detail) return String(data.detail)
  if (typeof data === 'object') {
    const parts = Object.entries(data).map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
      return field === 'non_field_errors' ? text : `${field}: ${text}`
    })
    if (parts.length) return parts.join(' | ')
  }
  return fallback
}


export class ApiError extends Error {
  constructor(status, data) {
    let message = getErrorMessage(data)

    // Handle Django HTML error pages
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      message = 'Server error. Please try again in a moment.'
    }

    super(message)

    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}


let refreshPromise = null

// Everyone who gets a 401 at the same time waits for the same refresh call.
function refreshTokens() {
  const refresh = tokenStore.getRefresh()
  if (!refresh) return Promise.reject(new Error('No refresh token'))

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: CREDENTIALS,
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Refresh failed')
        const data = await res.json()
        tokenStore.setTokens(data.access, data.refresh) // refresh token is rotated
        return data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}, retried = false) {
  const headers = {}
  const isForm = body instanceof FormData
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  const access = tokenStore.getAccess()
  if (auth && access) headers.Authorization = `Bearer ${access}`

let res
try {
  res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: CREDENTIALS,
    signal,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })
} catch (err) {
  if (err.name === 'AbortError') throw err // cancelled on purpose, not an error
  throw new ApiError(0, { error: 'Cannot reach the server. Please check your connection and try again.' })
}

  if (res.status === 401 && auth && access && !retried) {
    try {
      await refreshTokens()
    } catch {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:logout'))
      throw new ApiError(401, { error: 'Your session has expired. Please log in again.' })
    }
    return request(path, { method, body, auth, signal }, true)
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

// opts: { auth: false } for public endpoints, { signal } to cancel
export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}