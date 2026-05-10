import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Spinner from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, ShieldCheck, BarChart as BarChartIcon } from '../../components/ui/Icon';
import { fmtPrice, fmtDate } from '../../utils/format';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={36} /></div>;
  if (!stats) return <div style={{ padding: 40, color: 'var(--muted)' }}>Failed to load stats.</div>;

  const cards = [
    { label: 'Total Users', value: stats.users, icon: <Users />, color: 'var(--teal-700)' },
    { label: 'Active Listings', value: stats.listings, icon: <Package />, color: 'var(--teal-600)' },
    { label: 'Total Orders', value: stats.orders, icon: <ShieldCheck />, color: 'var(--amber)' },
    { label: 'Total Revenue', value: fmtPrice(stats.revenue || 0), icon: <BarChartIcon />, color: 'var(--green)' },
  ];

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub">Platform overview as of today.</p>

      <div className="admin-stat-grid">
        {cards.map(c => (
          <div key={c.label} className="admin-stat-card">
            <div className="admin-stat-icon" style={{ color: c.color }}>{c.icon}</div>
            <div className="admin-stat-value">{c.value}</div>
            <div className="admin-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {stats.categoryBreakdown?.length > 0 && (
        <div className="admin-card" style={{ marginTop: 24 }}>
          <h3 className="admin-card-title">Listings by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.categoryBreakdown} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              <Tooltip
                contentStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <Bar dataKey="count" fill="var(--teal-600)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stats.recentOrders?.length > 0 && (
        <div className="admin-card" style={{ marginTop: 24 }}>
          <h3 className="admin-card-title">Recent Orders</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map(o => (
                <tr key={o._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11 }}>{o.orderNumber}</td>
                  <td>{o.buyer?.name || '—'}</td>
                  <td>{o.items?.length || 0}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{fmtPrice(o.total)}</td>
                  <td><span className={`admin-badge ${o.status}`}>{o.status}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
