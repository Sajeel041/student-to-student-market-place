import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { Trash, Verified } from '../../components/ui/Icon';
import { fmtDate } from '../../utils/format';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    api.get('/admin/users', { params: { page: p, limit: 20 } })
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const update = async (id, data) => {
    await api.patch(`/admin/users/${id}`, data);
    load(page);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    await api.delete(`/admin/users/${id}`);
    load(page);
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-sub">{total} registered users</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Dept</th>
                <th>Role</th>
                <th>Banned</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ opacity: u.banned ? 0.5 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.name}
                      {u.role === 'admin' && <Verified style={{ width: 14, height: 14, color: 'var(--teal-700)' }} />}
                    </div>
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{u.email}</td>
                  <td>{u.dept || '—'}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => update(u._id, { role: e.target.value })}
                      className="admin-select"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className={`admin-badge ${u.banned ? 'banned' : 'active'}`}
                      onClick={() => update(u._id, { banned: !u.banned })}
                      style={{ cursor: 'pointer' }}
                    >
                      {u.banned ? 'Banned' : 'Active'}
                    </button>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(u.createdAt)}</td>
                  <td>
                    <button
                      className="admin-icon-btn danger"
                      onClick={() => del(u._id)}
                      aria-label="Delete user"
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
