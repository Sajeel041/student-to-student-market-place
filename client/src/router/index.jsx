import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import SearchPage from '../pages/SearchPage';
import ListingDetailPage from '../pages/ListingDetailPage';
import PostListingPage from '../pages/PostListingPage';
import ProfilePage from '../pages/ProfilePage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';

import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminListings from '../pages/admin/AdminListings';
import AdminOrders from '../pages/admin/AdminOrders';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    path: '/',
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
  },
  {
    path: '/search',
    element: <ProtectedRoute><SearchPage /></ProtectedRoute>,
  },
  {
    path: '/listing/:id',
    element: <ProtectedRoute><ListingDetailPage /></ProtectedRoute>,
  },
  {
    path: '/sell',
    element: <ProtectedRoute><PostListingPage /></ProtectedRoute>,
  },
  {
    path: '/profile',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  {
    path: '/profile/:userId',
    element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
  },
  {
    path: '/cart',
    element: <ProtectedRoute><CartPage /></ProtectedRoute>,
  },
  {
    path: '/checkout',
    element: <ProtectedRoute><CheckoutPage /></ProtectedRoute>,
  },

  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'listings', element: <AdminListings /> },
      { path: 'orders', element: <AdminOrders /> },
    ],
  },
]);

export default router;
