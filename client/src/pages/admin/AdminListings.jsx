import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { Trash, Check } from '../../components/ui/Icon';
import { fmtPrice, fmtDate } from '../../utils/format';

const TABS = [
  { id: 'active',   label: 'Active',   help: 'Currently listed for sale' },
  { id: 'unlisted', label: 'Unlisted', help: 'Sold or archived (no longer active)' },
  { id: 'all',      label: 'All',      help: 'Every listing ever posted' },
];

// Map tab → server-side status filter (multiple statuses joined by comma).
const STATUS_FOR_TAB = {
  active:   'active',
  unlisted: 'sold,archived',
  all:      '',
};

export default function AdminListings() {
  const [tab, setTab] = useState('active');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ active: 0, unlisted: 0, all: 0 });

  const refreshCounts = useCallback(async () => {
    try {
      const [a, s, ar, allRes] = await Promise.all([
        api.get('/admin/listings', { params: { status: 'active',   limit: 1 } }),
        api.get('/admin/listings', { params: { status: 'sold',     limit: 1 } }),
        api.get('/admin/listings', { params: { status: 'archived', limit: 1 } }),
        api.get('/admin/listings', { params: { limit: 1 } }),
      ]);
      setCounts({
        active:   a.data.total || 0,
        unlisted: (s.data.total || 0) + (ar.data.total || 0),
        all:      allRes.data.total || 0,
      });
    } catch { /* ignore */ }
  }, []);

  const load = useCallback((p = 1, t = tab) => {
    setLoading(true);
    const status = STATUS_FOR_TAB[t];
    api.get('/admin/listings', { params: { page: p, limit: 20, status: status || undefined } })
      .then(r => { setListings(r.data.listings || []); setTotal(r.data.total || 0); setPage(p); })
      .catch(() => { setListings([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(1, tab); refreshCounts(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tab]);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/listings/${id}`, { status });
    load(page, tab);
    refreshCounts();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    await api.delete(`/admin/listings/${id}`);
    load(page, tab);
    refreshCounts();
  };

  const activeTabMeta = TABS.find(t => t.id === tab);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Listings</h1>
      <p className="admin-page-sub">
        {total} {tab === 'all' ? 'listings' : `${activeTabMeta?.label.toLowerCase()} listings`}
        {' · '}{activeTabMeta?.help}
      </p>

      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`admin-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <span className="admin-tab-count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                      No listings in this tab.
                    </td>
                  </tr>
                ) : listings.map(l => (
                  <tr key={l._id}>
                    <td className="admin-cell-title" title={l.title}>{l.title}</td>
                    <td>{l.category}</td>
                    <td style={{ fontSize: 12 }}>{l.seller?.name || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtPrice(l.price)}</td>
                    <td>
                      <span className={`admin-badge listing ${l.status}`}>{l.status}</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        {l.status === 'active' ? (
                          <button
                            className="admin-action-btn"
                            onClick={() => updateStatus(l._id, 'sold')}
                            title="Mark as sold"
                          >
                            <Check style={{ width: 14, height: 14 }} /> <span>Mark as sold</span>
                          </button>
                        ) : (
                          <select
                            value={l.status}
                            onChange={e => updateStatus(l._id, e.target.value)}
                            className="admin-select"
                            aria-label="Change listing status"
                          >
                            <option value="active">re-list (active)</option>
                            <option value="sold">sold</option>
                            <option value="archived">archived</option>
                          </select>
                        )}
                        <button
                          className="admin-icon-btn danger"
                          onClick={() => del(l._id)}
                          aria-label="Delete listing"
                          title="Delete listing"
                        >
                          <Trash style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => load(page - 1, tab)} className="admin-page-btn">← Prev</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} · {total} total</span>
            <button disabled={page * 20 >= total} onClick={() => load(page + 1, tab)} className="admin-page-btn">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
