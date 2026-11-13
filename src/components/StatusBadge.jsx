import { capitalize } from '../utils/format'

// colours live in Orders.css (.order-status.pending, .confirmed, ...)
export default function StatusBadge({ status }) {
  return <span className={`order-status ${status}`}>{capitalize(status)}</span>
}