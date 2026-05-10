import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import Spinner from '../components/ui/Spinner';
import { fmtPrice, fmtDate } from '../utils/format';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    api.get(`/orders/${id}`)
      .then((r) => { if (!cancelled) setOrder(r.data); })
      .catch((e) => {
        if (!cancelled) setErr(e.response?.data?.message || 'Could not load order.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const markPickedUp = async () => {
    if (!order || busy) return;
    setBusy(true);
    try {
      setErr(null);
      const { data } = await api.patch(`/orders/${order._id}/status`, { status: 'picked_up' });
      setOrder(data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <TopBar onBack={() => navigate(-1)} title="Order" right={<div style={{ width: 44 }} />} />

      <div className="view">
        {loading ? (
          <div className="inbox-loading"><Spinner size={32} /></div>
        ) : err || !order ? (
          <div className="empty" style={{ padding: 40 }}>
            <h3>{err || 'Not found'}</h3>
            <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/inbox')}>
              Back to messages
            </button>
          </div>
        ) : (
          <div className="order-detail">
            <div className="order-detail-hd">
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{order.orderNumber}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Placed {fmtDate(order.createdAt)}</div>
            </div>

            <div className="order-detail-status">
              <span className="order-detail-status-lbl">Status</span>
              <span className="order-detail-status-val">{order.status.replace(/_/g, ' ')}</span>
            </div>

            <h4 className="order-detail-sec">Items</h4>
            <div className="order-detail-items">
              {order.items?.map((item, i) => (
                <div key={i} className="order-detail-item">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {item.qty > 1 ? `${item.qty} × ` : ''}{fmtPrice(item.price)}
                      {item.pickupLocation ? ` · ${item.pickupLocation}` : ''}
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700 }}>{fmtPrice(item.price * item.qty)}</div>
                </div>
              ))}
            </div>

            <div className="order-detail-sum">
              <div className="sum-row"><span>Subtotal</span><span className="mono">{fmtPrice(order.total - (order.serviceFee || 50))}</span></div>
              <div className="sum-row"><span>Service fee</span><span className="mono">{fmtPrice(order.serviceFee || 50)}</span></div>
              <div className="sum-row total"><span>Total</span><span className="mono">{fmtPrice(order.total)}</span></div>
            </div>

            <div className="order-detail-pickup">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pickup</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{order.pickupSlot}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{order.pickupLocation}</div>
            </div>

            {(order.status === 'placed' || order.status === 'confirmed') && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 24 }}
                disabled={busy}
                onClick={markPickedUp}
              >
                {busy ? 'Saving…' : 'I picked it up'}
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
