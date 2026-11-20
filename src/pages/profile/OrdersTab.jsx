import OrderList from '../../components/OrderList'

export default function OrdersTab() {
  return (
    <div className="panel">
      <h2>My orders</h2>
      <p className="panel-sub">Track an order, cancel it, or review what you received.</p>
      <OrderList />
    </div>
  )
}