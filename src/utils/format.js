// DRF sends decimals as strings ("2499.00"), so convert before displaying.
export function formatPrice(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '₹0'
  return '₹' + n.toLocaleString('en-IN')
}

// Avatar letter: first name if we have it, otherwise the first letter of the email.
export function getInitial(person) {
  const source = person?.first_name?.trim() || person?.email || person?.contact || ''
  return source ? source[0].toUpperCase() : '?'
}

export function getDisplayName(me) {
  const full = [me?.first_name, me?.last_name].filter(Boolean).join(' ').trim()
  return full || me?.email || me?.phone_number || 'Your account'
}

// Capitalize status text
export function capitalize(value) {
  if (!value) return ''

  return value.charAt(0).toUpperCase() + value.slice(1)
}

//Payment method labels
export const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  razorpay: 'Online Payment',
}


// Format date for order display
export function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Format date and time for order details
export function formatDateTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}