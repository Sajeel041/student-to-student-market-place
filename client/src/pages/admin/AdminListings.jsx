import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { Trash } from '../../components/ui/Icon';
import { fmtPrice, fmtDate } from '../../utils/format';

export default function AdminListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    api.get('/admin/listings', { params: { page: p, limit: 20 } })
      .then(r => { setListings(r.data.listings); setTotal(r.data.total); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/listings/${id}`, { status });
    load(page);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    await api.delete(`/admin/listings/${id}`);
    load(page);
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Listings</h1>
      <p className="admin-page-sub">{total} total listings</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Seller</th>
                <th>Price</th>
                <th>Status</th>
                <th>Posted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l._id}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.title}
                  </td>
                  <td>{l.category}</td>
                  <td style={{ fontSize: 12 }}>{l.seller?.name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtPrice(l.price)}</td>
                  <td>
                    <select
                      value={l.status}
                      onChange={e => updateStatus(l._id, e.target.value)}
                      className="admin-select"
                    >
                      <option value="active">active</option>
                      <option value="sold">sold</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(l.createdAt)}</td>
                  <td>
                    <button
                      className="admin-icon-btn danger"
                      onClick={() => del(l._id)}
                      aria-label="Delete listing"
                    >
                      <Trash style={{ width: 15, height: 15 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="admin-page-btn">← Prev</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} · {total} total</span>
            <button disabled={page * 20 >= total} onClick={() => load(page + 1)} className="admin-page-btn">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
