import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import RequireAuth from './components/RequireAuth'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderDetail from './pages/OrderDetail'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/profile/Profile'
import DetailsTab from './pages/profile/DetailsTab'
import PasswordTab from './pages/profile/PasswordTab'
import AddressesTab from './pages/profile/AddressesTab'
import SellerTab from './pages/profile/SellerTab'
import ReviewsTab from './pages/profile/ReviewsTab'
import OrdersTab from './pages/profile/OrdersTab'
import VendorLayout from './pages/vendor/VendorLayout'
import VendorDashboard from './pages/vendor/Dashboard'
import VendorProducts from './pages/vendor/Products'
import VendorProductForm from './pages/vendor/ProductForm'
import VendorInventory from './pages/vendor/Inventory'
import VendorOrders from './pages/vendor/VendorOrders'
import VendorOrderDetail from './pages/vendor/VendorOrderDetail'
import VendorSettings from './pages/vendor/Settings'
import './App.css'

function Footer() {
  return (
    <footer id="footer">
      <p>© 2026 Shoppy. Your everyday marketplace.</p>
    </footer>
  )
}

// Full navbar + footer: home, products, cart, orders, profile...
function MainLayout() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

// Minimal header: back arrow + centred logo. Used for login and checkout.
function AuthLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 'default' means the user opened this page directly, so there is nothing to go back to
  function goBack() {
    navigate(location.key !== 'default' ? -1 : '/')
  }

  return (
    <div className="app">
      <header className="auth-header">
        <button className="back-button" onClick={goBack} aria-label="Go back">
          ←
        </button>
        <Link className="logo" to="/">
          Shoppy<span>.</span>
        </Link>
      </header>

      <main className="auth-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function NotFound() {
  return (
    <section className="page-message">
      <h2>Page not found</h2>
      <p>This page doesn't exist yet.</p>
      <Link to="/" className="shop-button">
        Back to home
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />

        <Route path="/orders" element={<Navigate to="/profile/orders" replace />} />
        <Route
          path="/orders/:orderId"
          element={
            <RequireAuth>
              <OrderDetail />
            </RequireAuth>
          }
        />

        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="details" replace />} />
          <Route path="details" element={<DetailsTab />} />
          <Route path="orders" element={<OrdersTab />} />
          <Route path="password" element={<PasswordTab />} />
          <Route path="addresses" element={<AddressesTab />} />
          <Route path="reviews" element={<ReviewsTab />} />
          <Route path="seller" element={<SellerTab />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
      </Route>

      {/* Seller area: its own layout with a sidebar, separate from the shop navbar */}
      <Route
        path="/vendor"
        element={
          <RequireAuth>
            <VendorLayout />
          </RequireAuth>
        }
      >
        <Route index element={<VendorDashboard />} />
        <Route path="products" element={<VendorProducts />} />
        <Route path="products/new" element={<VendorProductForm />} />
        <Route path="products/:slug" element={<VendorProductForm />} />
        <Route path="inventory" element={<VendorInventory />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="orders/:orderId" element={<VendorOrderDetail />} />
        <Route path="settings" element={<VendorSettings />} />
      </Route>
    </Routes>
  )
}