import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { fmtPrice, fmtDate } from '../../utils/format';

const STATUSES = ['placed', 'confirmed', 'picked_up', 'cancelled', 'disputed'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    api.get('/admin/orders', { params: { page: p, limit: 20 } })
      .then(r => { setOrders(r.data.orders); setTotal(r.data.total); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/orders/${id}`, { status });
    load(page);
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Orders</h1>
      <p className="admin-page-sub">{total} total orders</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{o.orderNumber}</td>
                  <td style={{ fontSize: 12 }}>{o.buyer?.name || '—'}</td>
                  <td>{o.items?.length || 0}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtPrice(o.total)}</td>
                  <td style={{ fontSize: 11 }}>{o.paymentMethod}</td>
                  <td>
                    <select
                      value={o.status}
                      onChange={e => updateStatus(o._id, e.target.value)}
                      className="admin-select"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(o.createdAt)}</td>
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
