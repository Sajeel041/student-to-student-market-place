import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import ListingCard from '../components/ui/ListingCard';
import FilterSheet from '../components/forms/FilterSheet';
import Spinner from '../components/ui/Spinner';
import { Search, X, Filter, Clock, Tag, ArrowLeft } from '../components/ui/Icon';
import { CAT_TILES } from '../utils/constants';

const DEFAULT_FILTERS = { cats: [], cond: null, minPrice: '', maxPrice: '', pickup: null, moveOut: false, openOffers: false };

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    moveOut: searchParams.get('moveOut') === '1',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQ = useDebounce(q, 350);

  const showResults = debouncedQ.trim() || activeCat || Object.values(filters).some(v =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  const activeFilterCount =
    filters.cats.length +
    (filters.cond ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.pickup ? 1 : 0) +
    (filters.moveOut ? 1 : 0) +
    (filters.openOffers ? 1 : 0);

  useEffect(() => {
    if (!showResults) { setListings([]); return; }
    setLoading(true);
    const params = {
      ...(debouncedQ.trim() && { q: debouncedQ.trim() }),
      ...(activeCat && { category: activeCat }),
      ...(filters.cats.length === 1 && !activeCat && { category: filters.cats[0] }),
      ...(filters.cond && { condition: filters.cond }),
      ...(filters.minPrice && { minPrice: filters.minPrice }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      ...(filters.pickup && { pickup: filters.pickup }),
      ...(filters.moveOut && { moveOut: true }),
      ...(filters.openOffers && { openOffers: true }),
      limit: 60,
    };
    api.get('/listings', { params })
      .then(r => setListings(r.data.listings || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, activeCat, filters, showResults]);

  const clearAll = () => {
    setQ('');
    setActiveCat(null);
    setFilters(DEFAULT_FILTERS);
  };

  const trending = ['Move-Out Sale', 'CS-316 books', 'Hostel furniture', 'TI-84', 'mini fridge'];

  return (
    <div className="page">
      <TopBar right={<div style={{ width: 44 }} />} />

      <div className="view">
        <div className="searchbar" style={{ margin: '12px 16px 24px' }}>
          <Search />
          <input
            autoFocus
            placeholder="Search textbooks, furniture, electronics…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && (
            <button className="clear-btn" onClick={() => setQ('')} aria-label="Clear">
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <div className="filter-row">
          <button
            className={`filter-pill ${activeFilterCount ? 'active' : ''}`}
            onClick={() => setFilterOpen(true)}
          >
            <Filter /> Filters {activeFilterCount > 0 && (
              <span style={{
                fontFamily: 'var(--font-mono)', background: 'var(--teal-700)', color: 'white',
                borderRadius: 999, padding: '1px 6px', fontSize: 10,
              }}>{activeFilterCount}</span>
            )}
          </button>
          <button
            className={`filter-pill ${filters.moveOut ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, moveOut: !f.moveOut }))}
          >
            <Tag /> Move-Out
            {filters.moveOut && <span className="x"><X style={{ width: 10, height: 10 }} /></span>}
          </button>
          <button
            className={`filter-pill ${filters.openOffers ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, openOffers: !f.openOffers }))}
          >
            Open to offers
          </button>
        </div>

        {!showResults ? (
          <>
            <div className="sec-head"><h2>Browse by category</h2></div>
            <div className="cat-grid">
              {CAT_TILES.map(c => (
                <button
                  key={c.id}
                  className={`cat-tile ${activeCat === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  <span className="ico" style={{ fontSize: 22 }}>{c.emoji || '📦'}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <div className="sec-head"><h2>Trending at GIKI</h2></div>
            <div className="chip-row" style={{ padding: '0 20px 24px' }}>
              {trending.map((t, i) => (
                <button key={i} className="chip" onClick={() => setQ(t)}>{t}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '0 20px 12px', fontSize: 13, color: 'var(--muted)' }}>
              {loading ? (
                <Spinner size={16} />
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', fontWeight: 700 }}>
                    {listings.filter(l => l.status === 'active').length}
                  </span>{' '}results
                  {debouncedQ && <> for "<span style={{ color: 'var(--ink)', fontWeight: 600 }}>{debouncedQ}</span>"</>}
                  {activeCat && <> in <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{activeCat}</span></>}
                  <button onClick={clearAll} style={{ marginLeft: 8, color: 'var(--teal-700)', fontWeight: 700 }}>
                    Clear all
                  </button>
                </>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spinner size={32} />
              </div>
            ) : listings.filter(l => l.status === 'active').length === 0 ? (
              <div className="empty">
                <div className="ico"><Search /></div>
                <h3>No matches</h3>
                <p>Try removing a filter, or check trending searches above.</p>
              </div>
            ) : (
              <div className="feed-grid">
                {listings.filter(l => l.status === 'active').map(l => (
                  <ListingCard key={l._id} listing={l} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          onApply={f => { setFilters(f); setFilterOpen(false); }}
          onClose={() => setFilterOpen(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
