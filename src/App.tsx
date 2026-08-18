import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/common/ProtectedRoute';
import OrderNotificationPopup from './components/common/OrderNotificationPopup';

// Lazy load pages
const Home = lazy(() => import('./pages/customer/Home'));
const Products = lazy(() => import('./pages/customer/Products'));
const ProductDetail = lazy(() => import('./pages/customer/ProductDetail'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const Checkout = lazy(() => import('./pages/customer/Checkout'));
const OrderHistory = lazy(() => import('./pages/customer/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/customer/OrderDetail'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const QRMenu = lazy(() => import('./pages/qr/QRMenu'));
const QRCheckout = lazy(() => import('./pages/qr/QRCheckout'));
const QRTracking = lazy(() => import('./pages/qr/QRTracking'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminTables = lazy(() => import('./pages/admin/Tables'));
const AdminEditRequests = lazy(() => import('./pages/admin/EditRequests'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Owner pages
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));

function App() {
  return (
    <>
    <OrderNotificationPopup />
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* QR Order Routes */}
        <Route path="/qr/:tableId" element={<QRMenu />} />
        <Route path="/qr/:tableId/checkout" element={<QRCheckout />} />
        <Route path="/qr/order/:orderNumber" element={<QRTracking />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminCategories /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={[3]}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/tables" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminTables /></ProtectedRoute>} />
        <Route path="/admin/edit-requests" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminEditRequests /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={[2, 3]}><AdminSettings /></ProtectedRoute>} />

        {/* Owner Routes */}
        <Route path="/owner" element={<ProtectedRoute allowedRoles={[3]}><OwnerDashboard /></ProtectedRoute>} />
      </Routes>
    </Suspense>
    </>
  );
}

export default App;
