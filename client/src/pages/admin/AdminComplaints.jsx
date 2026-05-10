import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { fmtDate } from '../../utils/format';

export default function AdminComplaints() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');

  const load = (p = 1, st = status) => {
    setLoading(true);
    api.get('/admin/complaints', { params: { page: p, limit: 20, status: st || undefined } })
      .then(r => {
        setRows(r.data.complaints || []);
        setTotal(r.data.total || 0);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = async (id, patch) => {
    await api.patch(`/admin/complaints/${id}`, patch);
    load(page);
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Complaints</h1>
      <p className="admin-page-sub">{total} total complaints</p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-hd">
          <div className="admin-card-title">Filters</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); load(1, e.target.value); }}
              className="admin-select"
              aria-label="Status filter"
            >
              <option value="">all</option>
              <option value="open">open</option>
              <option value="in_review">in_review</option>
              <option value="resolved">resolved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Complainant</th>
                <th>Against</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Admin note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c._id}>
                  <td style={{ maxWidth: 240 }}>
                    <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{c.subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {c.description}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.complainant?.name || '—'}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{c.complainant?.email}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{c.againstUser?.name || '—'}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{c.againstUser?.email}</div>
                  </td>
                  <td style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>{c.againstRole}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) => update(c._id, { status: e.target.value })}
                      className="admin-select"
                    >
                      <option value="open">open</option>
                      <option value="in_review">in_review</option>
                      <option value="resolved">resolved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(c.createdAt)}</td>
                  <td style={{ minWidth: 240 }}>
                    <textarea
                      value={c.adminNote || ''}
                      onChange={(e) => update(c._id, { adminNote: e.target.value })}
                      placeholder="Add internal note…"
                      style={{
                        width: '100%',
                        minHeight: 64,
                        padding: 10,
                        borderRadius: 12,
                        border: '1px solid var(--border-2)',
                        fontFamily: 'inherit',
                        fontSize: 13,
                      }}
                    />
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

