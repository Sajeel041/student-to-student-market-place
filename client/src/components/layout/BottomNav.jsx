import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Inbox, User } from '../ui/Icon';

// Mobile bottom navigation. The Sell ("+") button sits as the third of five
// slots so it lands in the exact horizontal centre of the bar. Complaints lives
// on the desktop top-bar and inside the Profile page menu — keeping it out of
// the bottom bar lets us anchor "+" to the middle without an off-balance count.
const items = [
  { id: 'home', path: '/', label: 'Home', I: Home },
  { id: 'search', path: '/search', label: 'Search', I: Search },
  { id: 'sell', path: '/sell', label: 'Sell', sell: true },
  { id: 'inbox', path: '/inbox', label: 'Messages', I: Inbox },
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
    if (pathname.startsWith('/profile')) return 'profile';
    return null;
  })();

  return (
    <div className="bottomnav">
      {items.map(it => {
        if (it.sell) {
          return (
            <div key={it.id} className="bn-sell-slot">
              <button
                className="bn-sell"
                onClick={() => navigate('/sell')}
                aria-label="Post a listing"
              >
                <Plus />
              </button>
            </div>
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
