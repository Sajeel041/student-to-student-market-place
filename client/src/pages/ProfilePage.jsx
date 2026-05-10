import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import ListingCard from '../components/ui/ListingCard';
import Spinner from '../components/ui/Spinner';
import { Verified, Tag, HeartO, Star, Check, LogOut } from '../components/ui/Icon';
import { fmtPrice, fmtDate } from '../utils/format';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();

  const isOwn = !userId || (me && userId === me._id);
  const targetId = userId || me?._id;

  const [profile, setProfile] = useState(null);
  const [activeListings, setActiveListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('selling');

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    const fetches = [
      api.get(`/users/${targetId}`).then(r => setProfile(r.data)),
      api.get(`/listings/user/${targetId}`).then(r => setActiveListings(r.data)),
      api.get(`/reviews/user/${targetId}`).then(r => setReviews(r.data)),
    ];
    if (isOwn) {
      fetches.push(api.get('/users/me/saved').then(r => setSavedListings(r.data)));
      fetches.push(api.get('/orders').then(r => setOrders(r.data)));
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false));
  }, [targetId, isOwn]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size={32} />
    </div>
  );
  if (!profile) return null;

  const soldOrders = orders.filter(o => o.status === 'picked_up' || o.status === 'confirmed');

  const tabs = [
    { id: 'selling', label: 'Selling', count: activeListings.length },
    ...(isOwn ? [{ id: 'sold', label: 'Sold', count: soldOrders.length }] : []),
    ...(isOwn ? [{ id: 'saved', label: 'Saved', count: savedListings.length }] : []),
    { id: 'reviews', label: 'Reviews', count: reviews.length },
  ];

  return (
    <div className="page">
      <TopBar onBack={userId ? () => navigate(-1) : undefined} right={isOwn ? undefined : <div style={{ width: 44 }} />} />

      <div className="view">
        <div className="profile-head">
          <div className="avatar avatar-lg av-teal">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : profile.name?.[0]?.toUpperCase()
            }
          </div>
          <div className="info">
            <div className="nm">
              {profile.name}
              <Verified style={{ width: 18, height: 18, color: 'var(--teal-700)' }} />
            </div>
            <div className="handle">@{profile.handle}</div>

            {isOwn && (
              <div className="profile-logout">
                <button className="profile-logout-btn" onClick={logout}>
                  <LogOut width={14} height={14} /> Log out
                </button>
              </div>
            )}

            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="verify-pill">Verified GIKI student</span>
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className="profile-bio">{profile.bio}</div>
        )}
        {!profile.bio && (
          <div className="profile-bio" style={{ color: 'var(--muted)' }}>
            {profile.dept && `${profile.dept}`}
            {profile.batch && ` · Batch '${profile.batch.slice(2)}`}
            {profile.dept || profile.batch ? ' · ' : ''}GIKI Topi
          </div>
        )}

        <div className="profile-stats">
          <div className="col">
            <div className="num">{profile.soldCount || 0}</div>
            <div className="lbl">Sold</div>
          </div>
          <div className="col">
            <div className="num">{activeListings.length}</div>
            <div className="lbl">Active</div>
          </div>
          <div className="col">
            <div className="num">{profile.rating?.toFixed(1) || '—'}</div>
            <div className="lbl">Rating</div>
          </div>
          <div className="col">
            <div className="num">{profile.reviewCount || 0}</div>
            <div className="lbl">Reviews</div>
          </div>
        </div>

        {isOwn && (
          <div className="profile-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>Edit profile</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/sell')}>+ Post listing</button>
          </div>
        )}

        <div className="tab-bar">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} <span className="count">{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'selling' && (
          activeListings.length ? (
            <div className="feed-grid">
              {activeListings.map(l => <ListingCard key={l._id} listing={l} />)}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><Tag /></div>
              <h3>No active listings</h3>
              <p>{isOwn ? 'Tap + to post your first item.' : 'No active listings right now.'}</p>
            </div>
          )
        )}

        {tab === 'sold' && isOwn && (
          soldOrders.length ? (
            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {soldOrders.map(order => (
                <div
                  key={order._id}
                  style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => navigate(`/order/${order._id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{order.orderNumber}</span>
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check style={{ width: 12, height: 12 }} /> {order.status === 'picked_up' ? 'Picked up' : 'Confirmed'}
                    </span>
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  ))}
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--teal-700)' }}>
                    {fmtPrice(order.total)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><Check /></div>
              <h3>No completed orders</h3>
              <p>Orders marked as picked up will appear here.</p>
            </div>
          )
        )}

        {tab === 'saved' && isOwn && (
          savedListings.length ? (
            <div className="feed-grid">
              {savedListings.map(l => <ListingCard key={l._id} listing={l} />)}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><HeartO /></div>
              <h3>Nothing saved yet</h3>
              <p>Tap the heart on any listing to save it for later.</p>
            </div>
          )
        )}

        {tab === 'reviews' && (
          reviews.length ? (
            <div className="review-list" style={{ padding: '0 20px 24px' }}>
              {profile.reviewCount > 0 && (
                <div style={{ padding: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {profile.rating?.toFixed(1)}
                    </div>
                    <div className="stars-row" style={{ marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} style={{ width: 14, height: 14 }} />)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>From {profile.reviewCount} buyers</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>All buyers verified @giki.edu.pk</div>
                  </div>
                </div>
              )}
              {reviews.map(r => (
                <div key={r._id} className="review-row">
                  <div className="avatar av-teal" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
                    {r.reviewer?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="body">
                    <div className="top">
                      <div className="nm">{r.reviewer?.name}</div>
                      <div className="stars">{Array.from({ length: r.stars }).map((_, i) => <Star key={i} style={{ width: 12, height: 12 }} />)}</div>
                    </div>
                    <p>{r.text}</p>
                    <div className="when">{fmtDate(r.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><Star /></div>
              <h3>No reviews yet</h3>
              <p>Reviews appear after completed transactions.</p>
            </div>
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}
