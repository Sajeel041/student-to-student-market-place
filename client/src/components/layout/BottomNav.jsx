import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Inbox, User, Warning } from '../ui/Icon';

const items = [
  { id: 'home', path: '/', label: 'Home', I: Home },
  { id: 'search', path: '/search', label: 'Search', I: Search },
  { id: 'sell', path: '/sell', label: 'Sell', sell: true },
  { id: 'inbox', path: '/inbox', label: 'Messages', I: Inbox },
  { id: 'complaints', path: '/complaints', label: 'Complaints', I: Warning },
  { id: 'profile', path: '/profile', label: 'Profile', I: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const active = (() => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/sell')) return 'sell';
    if (pathname.startsWith('/inbox') || pathname.startsWith('/chat')) return 'inbox';
    if (pathname.startsWith('/complaints')) return 'complaints';
    if (pathname.startsWith('/profile')) return 'profile';
    return null;
  })();

  return (
    <div className="bottomnav">
      {items.map(it => {
        if (it.sell) {
          return (
            <button
              key={it.id}
              className="bn-sell"
              onClick={() => navigate('/sell')}
              aria-label="Post a listing"
            >
              <Plus />
            </button>
          );
        }
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            className={`bn-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(it.path)}
          >
            <it.I />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
