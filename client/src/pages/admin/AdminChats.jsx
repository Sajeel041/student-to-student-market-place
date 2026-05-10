import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { fmtRelativeTime } from '../../utils/format';

export default function AdminChats() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    api.get('/admin/conversations', { params: { page: p, limit: 30 } })
      .then(r => {
        setRows(r.data.conversations || []);
        setTotal(r.data.total || 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Chats</h1>
      <p className="admin-page-sub">{total} conversations (read-only)</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-chat-split">
          <div className="admin-chat-list">
            {rows.map(c => (
              <NavLink
                key={c._id}
                to={`/admin/chats/${c._id}`}
                className={({ isActive }) => `admin-chat-row${isActive ? ' active' : ''}`}
              >
                <div className="admin-chat-row-top">
                  <div className="admin-chat-row-title">
                    {c.listing?.title || 'Listing'}
                  </div>
                  <div className="admin-chat-row-time">
                    {c.lastMessageAt ? fmtRelativeTime(c.lastMessageAt) : '—'}
                  </div>
                </div>
                <div className="admin-chat-row-sub">
                  <span><strong>Buyer:</strong> {c.buyer?.name || '—'} <span className="mono">({c.buyer?.email || '—'})</span></span>
                </div>
                <div className="admin-chat-row-sub">
                  <span><strong>Seller:</strong> {c.seller?.name || '—'} <span className="mono">({c.seller?.email || '—'})</span></span>
                </div>
              </NavLink>
            ))}

            <div className="admin-pagination" style={{ borderTop: '1px solid var(--border)' }}>
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="admin-page-btn">← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page}</span>
              <button disabled={page * 30 >= total} onClick={() => load(page + 1)} className="admin-page-btn">Next →</button>
            </div>
          </div>

          <div className="admin-chat-view">
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
}

