import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell, Cart, Home, Search, Plus, Inbox, User, Warning } from '../ui/Icon';
import { useCart } from '../../contexts/CartContext';
import CartDrawer from '../ui/CartDrawer';
import api from '../../lib/api';
import { fmtRelativeTime } from '../../utils/format';
import Toast from '../ui/Toast';
import { useToast } from '../../hooks/useToast';

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
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [notifItems, setNotifItems] = useState([]);
  const prevUnreadRef = useRef(0);
  const { toast, showToast, dismissToast } = useToast();

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

  const bellBadge = useMemo(() => (notifUnread > 99 ? '99+' : notifUnread), [notifUnread]);
  const msgBadge = useMemo(() => (msgUnread > 99 ? '99+' : msgUnread), [msgUnread]);

  const refreshCounts = async (opts = {}) => {
    try {
      const [allRes, msgRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications/unread-count', { params: { type: 'message' } }),
      ]);
      const nextAll = Number(allRes.data?.unread || 0);
      const nextMsg = Number(msgRes.data?.unread || 0);
      setNotifUnread(nextAll);
      setMsgUnread(nextMsg);
      if (!opts.silent && nextAll > (prevUnreadRef.current || 0)) {
        showToast({ kind: 'info', msg: 'You have a new notification.' });
      }
      prevUnreadRef.current = nextAll;
    } catch {
      // ignore (user may be logged out)
    }
  };

  const refreshItems = async () => {
    try {
      const res = await api.get('/notifications', { params: { limit: 12 } });
      setNotifItems(res.data?.items || []);
    } catch {
      setNotifItems([]);
    }
  };

  useEffect(() => {
    refreshCounts({ silent: true });
    const t = setInterval(() => refreshCounts(), 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (notifOpen) refreshItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!notifOpen) return;
      const target = e.target;
      const pop = document.getElementById('notif-popover');
      const btn = document.getElementById('notif-btn');
      if (pop && pop.contains(target)) return;
      if (btn && btn.contains(target)) return;
      setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  // Mobile-only shortcut to Complaints. On ≥768px the same destination is
  // already in `.topbar-nav`, so we hide this button there via CSS.
  const complaintsButton = (
    <button
      className="back-btn topbar-mobile-only"
      onClick={() => navigate('/complaints')}
      aria-label="Complaints"
      title="Complaints"
    >
      <Warning />
    </button>
  );

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

  const bellButton = (
    <div style={{ position: 'relative' }}>
      <button
        id="notif-btn"
        className="back-btn"
        onClick={() => setNotifOpen((s) => !s)}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell />
        {notifUnread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--teal-700)', color: 'white',
            borderRadius: 999, fontSize: 9, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            minWidth: 16, height: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {bellBadge}
          </span>
        )}
      </button>

      {notifOpen && (
        <div id="notif-popover" className="notif-popover">
          <div className="notif-popover-top">
            <div className="notif-popover-title">Notifications</div>
            <button
              className="notif-popover-mark"
              onClick={async () => {
                await api.post('/notifications/mark-read', {});
                setNotifUnread(0);
                setMsgUnread(0);
                refreshItems();
              }}
              disabled={notifUnread === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="notif-popover-list">
            {notifItems.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              notifItems.map((n) => (
                <button
                  key={n._id}
                  className={`notif-row ${n.readAt ? '' : 'unread'}`}
                  onClick={async () => {
                    try {
                      if (!n.readAt) await api.post('/notifications/mark-read', { ids: [n._id] });
                    } catch { /* ignore */ }
                    setNotifOpen(false);
                    refreshCounts({ silent: true });
                    if (n.url) navigate(n.url);
                  }}
                >
                  <div className="notif-row-top">
                    <div className="notif-row-title">{n.title}</div>
                    <div className="notif-row-time">{fmtRelativeTime(n.createdAt)}</div>
                  </div>
                  {n.body ? <div className="notif-row-body">{n.body}</div> : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
                style={it.id === 'inbox' ? { position: 'relative' } : undefined}
              >
                <it.I /> {it.label}
                {it.id === 'inbox' && msgUnread > 0 && (
                  <span className="topbar-pill-badge">
                    {msgBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {right !== undefined ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {right}
            {complaintsButton}
            {bellButton}
            {cartButton}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {complaintsButton}
            {bellButton}
            {cartButton}
          </div>
        )}
      </div>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
