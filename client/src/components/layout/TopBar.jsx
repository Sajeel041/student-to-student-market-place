import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Cart, Home, Search, Plus, Inbox, User, Warning } from '../ui/Icon';
import { useCart } from '../../contexts/CartContext';
import CartDrawer from '../ui/CartDrawer';

const navItems = [
  { id: 'home', path: '/', label: 'Home', I: Home },
  { id: 'search', path: '/search', label: 'Search', I: Search },
  { id: 'sell', path: '/sell', label: 'Sell', sell: true },
  { id: 'inbox', path: '/inbox', label: 'Messages', I: Inbox },
  { id: 'complaints', path: '/complaints', label: 'Complaints', I: Warning },
  { id: 'profile', path: '/profile', label: 'Profile', I: User },
];

export default function TopBar({ onBack, title, kicker, right, withBorder, transparent }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleBack = onBack || (() => navigate(-1));

  const activeNav = (() => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/sell')) return 'sell';
    if (pathname.startsWith('/inbox') || pathname.startsWith('/chat')) return 'inbox';
    if (pathname.startsWith('/complaints')) return 'complaints';
    if (pathname.startsWith('/profile')) return 'profile';
    return null;
  })();

  const cartButton = (
    <button
      className="back-btn"
      onClick={() => setDrawerOpen(true)}
      aria-label="Cart"
      style={{ position: 'relative' }}
    >
      <Cart />
      {cartCount > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: 'var(--teal-700)', color: 'white',
          borderRadius: 999, fontSize: 9, fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          minWidth: 16, height: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      <div
        className={`topbar ${withBorder ? 'with-border' : ''}`}
        style={transparent ? { background: 'transparent' } : undefined}
      >
        {onBack !== undefined ? (
          onBack ? (
            <button className="back-btn" onClick={handleBack} aria-label="Back">
              <ArrowLeft />
            </button>
          ) : (
            <div style={{ width: 44 }} />
          )
        ) : (
          <div className="brand">
            <span className="brand-dot">U</span>
            UniSwap
          </div>
        )}

        {title && (
          kicker ? (
            <div className="topbar-mid">
              <div className="topbar-kicker">{kicker}</div>
              <div className="topbar-title-main">{title}</div>
            </div>
          ) : (
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>
              {title}
            </div>
          )
        )}

        <nav className="topbar-nav">
          {navItems.map(it => {
            if (it.sell) {
              return (
                <button key={it.id} className="topbar-nav-sell" onClick={() => navigate('/sell')}>
                  <Plus /> Sell
                </button>
              );
            }
            return (
              <button
                key={it.id}
                className={`topbar-nav-item ${activeNav === it.id ? 'active' : ''}`}
                onClick={() => navigate(it.path)}
              >
                <it.I /> {it.label}
              </button>
            );
          })}
        </nav>

        {right !== undefined ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {right}
            {cartButton}
          </div>
        ) : cartButton}
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
