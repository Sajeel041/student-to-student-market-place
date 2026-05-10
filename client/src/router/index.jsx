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
import InboxPage from '../pages/InboxPage';
import ChatPage from '../pages/ChatPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import ComplaintsPage from '../pages/ComplaintsPage';

import AdminLayout from '../pages/admin/AdminLayout';
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminListings from '../pages/admin/AdminListings';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminComplaints from '../pages/admin/AdminComplaints';
import AdminChats from '../pages/admin/AdminChats';
import AdminChatThread from '../pages/admin/AdminChatThread';

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
    path: '/inbox',
    element: <ProtectedRoute><InboxPage /></ProtectedRoute>,
  },
  {
    path: '/chat/:id',
    element: <ProtectedRoute><ChatPage /></ProtectedRoute>,
  },
  {
    path: '/order/:id',
    element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute>,
  },
  {
    path: '/complaints',
    element: <ProtectedRoute><ComplaintsPage /></ProtectedRoute>,
  },

  { path: '/admin/login', element: <AdminLoginPage /> },

  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'listings', element: <AdminListings /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'complaints', element: <AdminComplaints /> },
      {
        path: 'chats',
        element: <AdminChats />,
        children: [
          { path: ':id', element: <AdminChatThread /> },
        ],
      },
    ],
  },
]);

export default router;
