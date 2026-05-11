import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Users, Package, ShieldCheck, Home, LogOut,
  Warning, Inbox, X,
} from '../../components/ui/Icon';
import './admin.css';

const NAV_LINKS = [
  { to: '/admin',            end: true, label: 'Dashboard',  Icon: BarChart    },
  { to: '/admin/users',                  label: 'Users',      Icon: Users       },
  { to: '/admin/listings',               label: 'Listings',   Icon: Package     },
  { to: '/admin/orders',                 label: 'Orders',     Icon: ShieldCheck },
  { to: '/admin/complaints',             label: 'Complaints', Icon: Warning     },
  { to: '/admin/chats',                  label: 'Chats',      Icon: Inbox       },
];

function Hamburger(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const currentLink = NAV_LINKS.find(l => (l.end ? pathname === l.to : pathname.startsWith(l.to)));
  const currentTitle = currentLink?.label || 'Admin';

  return (
    <div className={`admin-root${drawerOpen ? ' drawer-open' : ''}`}>
      <header className="admin-mobilebar">
        <button
          className="admin-mobilebar-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Hamburger />
        </button>
        <div className="admin-mobilebar-title">
          <span className="admin-mobilebar-brand">UniSwap</span>
          <span className="admin-mobilebar-sep">·</span>
          <span>{currentTitle}</span>
        </div>
      </header>

      <button
        type="button"
        className="admin-drawer-scrim"
        aria-hidden={!drawerOpen}
        tabIndex={-1}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo">
            <ShieldCheck />
          </div>
          <div>
            <div className="admin-sidebar-name">UniSwap</div>
            <div className="admin-sidebar-tag">Admin Panel</div>
          </div>
          <button
            className="admin-sidebar-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>

        <nav className="admin-nav">
          {NAV_LINKS.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
            >
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
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
