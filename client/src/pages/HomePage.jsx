import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import ListingCard from '../components/ui/ListingCard';
import Spinner from '../components/ui/Spinner';
import { Search, Sliders, Pin, Tag } from '../components/ui/Icon';
import { CATEGORIES } from '../utils/constants';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get('/listings', { params: { limit: 60, sort: 'recent' } })
      .then(r => setListings(r.data.listings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    cat === 'all' ? listings : listings.filter(l => l.category === cat),
    [listings, cat]
  );

  const moveOutListings = useMemo(() =>
    listings.filter(l => l.moveOut && l.status === 'active').slice(0, 6),
    [listings]
  );

  const activeListing = filtered.filter(l => l.status === 'active');

  return (
    <div className="page">
      <TopBar />

      <div className="view">
        <div className="greet">
          <h1>Hi {user?.name?.split(' ')[0] || 'there'} — find it on campus.</h1>
          <p className="sub">Buy and sell with verified GIKI students.</p>
          <span className="campus-pill">
            <Pin />
            GIKI Topi
          </span>
        </div>

        <div className="searchbar" onClick={() => navigate('/search')} role="button" style={{ cursor: 'pointer' }}>
          <Search />
          <input placeholder="Search textbooks, furniture, electronics…" readOnly style={{ cursor: 'pointer' }} />
          <Sliders style={{ color: 'var(--teal-700)' }} />
        </div>

        {moveOutListings.length > 0 && (
          <div className="hero-card">
            <div className="label">Limited time · End of semester</div>
            <h3>Move-Out Sale is on.</h3>
            <p>Final-year students unloading furniture, fridges & more. Bargains close fast.</p>
            <div className="stats">
              <div className="stat">
                <span className="num">{moveOutListings.length}</span>
                <span className="lbl">MOVE-OUT ITEMS</span>
              </div>
              <div className="stat">
                <span className="num">{listings.length}</span>
                <span className="lbl">TOTAL ACTIVE</span>
              </div>
            </div>
          </div>
        )}

        <div className="chip-row">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`chip ${cat === c.id ? 'active' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {cat === 'all' && moveOutListings.length > 0 && (
          <>
            <div className="sec-head">
              <h2>Move-Out Sale</h2>
              <button className="more" onClick={() => navigate('/search?moveOut=1')}>See all →</button>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '0 20px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {moveOutListings.map(l => (
                <div key={l._id} style={{ flexShrink: 0, width: 168 }}>
                  <ListingCard listing={l} condensed />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="sec-head">
          <h2>{cat === 'all' ? 'Recent on campus' : `In ${cat}`}</h2>
          {!loading && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              {activeListing.length} listings
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size={32} />
          </div>
        ) : activeListing.length === 0 ? (
          <div className="empty">
            <div className="ico"><Tag /></div>
            <h3>No listings yet</h3>
            <p>Be the first to post something on campus!</p>
          </div>
        ) : (
          <div className="feed-grid">
            {activeListing.map(l => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
