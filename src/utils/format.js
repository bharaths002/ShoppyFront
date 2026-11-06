// DRF sends decimals as strings ("2499.00"), so convert before displaying.
export function formatPrice(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '₹0'
  return '₹' + n.toLocaleString('en-IN')
}