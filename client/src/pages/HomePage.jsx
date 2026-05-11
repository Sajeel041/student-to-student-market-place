import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import ListingCard from '../components/ui/ListingCard';
import Spinner from '../components/ui/Spinner';
import { Search, Sliders, Plus, Tag } from '../components/ui/Icon';
import { CATEGORIES } from '../utils/constants';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const productsRef = useRef(null);

  // On mobile the category grid sits above the products list, so after picking
  // a category we scroll the user down to the filtered results. We roll our own
  // tween (rather than `scrollIntoView({behavior:'smooth'})`) because the
  // native implementation is too quick — about 300ms regardless of distance —
  // and feels jumpy. A longer, gently-eased motion reads as intentional and
  // lets the user follow the filtering happening on screen.
  const pickCategory = (id) => {
    setCat(id);

    // Wait two animation frames so React has fully committed the re-render and
    // the products list below has its final height. Measuring on the very next
    // frame can produce a stale target (the old, unfiltered list), which
    // sometimes resolved to a tiny scroll distance and felt instantaneous.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const isMobile =
        typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile || !productsRef.current) return;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const targetEl = productsRef.current;
      const styles = window.getComputedStyle(targetEl);
      const offset = parseFloat(styles.scrollMarginTop) || 0;
      const targetY = Math.max(
        0,
        targetEl.getBoundingClientRect().top + window.pageYOffset - offset,
      );

      if (prefersReducedMotion) {
        window.scrollTo(0, targetY);
        return;
      }

      const startY = window.pageYOffset;
      const distance = targetY - startY;
      if (Math.abs(distance) < 4) return;

      // easeInOutCubic gives a symmetric S-curve: gentle start, accelerates
      // through the middle, decelerates at the end. Earlier we tried an
      // ease-out-quart, but with a quartic curve ~94% of the distance is
      // covered in the first half of the timeline, which visually reads as
      // an instant jump followed by a long imperceptible tail — exactly the
      // "quick snap" the user reported. The S-curve feels like a deliberate
      // glide instead. Duration scales with the distance (within sane
      // bounds) so a short hop doesn't drag and a long page doesn't whip.
      const absDistance = Math.abs(distance);
      const duration = Math.max(700, Math.min(1500, absDistance * 1.3));
      const startTime = performance.now();
      const easeInOutCubic = (t) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        window.scrollTo(0, startY + distance * easeInOutCubic(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
  };

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

  const catCounts = useMemo(() => {
    const counts = {};
    listings.filter(l => l.status === 'active').forEach(l => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });
    counts.all = listings.filter(l => l.status === 'active').length;
    return counts;
  }, [listings]);

  return (
    <div className="page">
      <TopBar />

      <div className="view">
        {/* ── Hero Section ────────────────────────────────── */}
        <section className="hero-section">
          <h1 className="hero-heading">
            Find it on <span className="hero-accent">campus.</span>
          </h1>
          <p className="hero-sub">
            The student marketplace for GIKI. Buy, sell & swap with verified students.
          </p>

          <div className="searchbar" onClick={() => navigate('/search')} role="button" style={{ cursor: 'pointer' }}>
            <Search />
            <input placeholder="Search textbooks, furniture, electronics…" readOnly style={{ cursor: 'pointer' }} />
            <Sliders style={{ color: 'var(--teal-700)' }} />
          </div>
        </section>

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

        {/* ── Explore Categories ──────────────────────────── */}
        <div className="sec-label">
          <span className="sec-label-text">Explore</span>
          <span className="sec-label-bar" />
        </div>

        <div className="cat-bento">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`cat-bento-card ${cat === c.id ? 'active' : ''}`}
              data-cat={c.id}
              onClick={() => pickCategory(c.id)}
            >
              <span className="cat-bento-icon">{c.emoji}</span>
              <span className="cat-bento-label">{c.label}</span>
              <span className="cat-bento-sub">
                {catCounts[c.id] || 0} {(catCounts[c.id] || 0) === 1 ? 'item' : 'items'}
              </span>
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

        {/* ── Recent Listings ─────────────────────────────── */}
        <div ref={productsRef} className="sec-label home-products-anchor">
          <span className="sec-label-dot" />
          <span className="sec-label-text">
            {cat === 'all' ? 'Recent on campus' : `In ${cat}`}
          </span>
          <span className="sec-label-bar" />
          {!loading && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
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
            <button type="button" className="empty-cta" onClick={() => navigate('/sell')}>
              <Plus aria-hidden />
              <span className="empty-cta-label">Post First Listing</span>
            </button>
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
