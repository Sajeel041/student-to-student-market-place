import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Users, Package, ShieldCheck, Home, LogOut } from '../../components/ui/Icon';
import './admin.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">
            <ShieldCheck />
          </div>
          <div>
            <div className="admin-sidebar-name">UniSwap</div>
            <div className="admin-sidebar-tag">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
            <BarChart /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
            <Users /> <span>Users</span>
          </NavLink>
          <NavLink to="/admin/listings" className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
            <Package /> <span>Listings</span>
          </NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
            <ShieldCheck /> <span>Orders</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-footer-btn" onClick={() => navigate('/')}>
            <Home /> <span>Back to app</span>
          </button>
          <button className="admin-sidebar-footer-btn" onClick={handleLogout}>
            <LogOut /> <span>Logout ({user?.name})</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
