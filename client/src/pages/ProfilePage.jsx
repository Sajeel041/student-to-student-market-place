import { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import ListingCard from '../components/ui/ListingCard';
import Spinner from '../components/ui/Spinner';
import EditProfileModal from '../components/ui/EditProfileModal';
import ReviewModal from '../components/ui/ReviewModal';
import { Verified, Tag, HeartO, Star, Check, LogOut, Warning, Clock } from '../components/ui/Icon';
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
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('selling');
  const [editOpen, setEditOpen] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('pending');
  // 'buy' shows orders the user is the buyer on; 'sell' shows incoming
  // orders for items they're selling.
  const [orderRole, setOrderRole] = useState('buy');
  const [myReviews, setMyReviews] = useState([]);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRole, setReviewRole] = useState('buyer'); // 'buyer' or 'seller'
  const [orderBusyId, setOrderBusyId] = useState(null);

  const refreshMine = useCallback(async () => {
    if (!isOwn || !me?._id) return;
    try {
      const r = await api.get('/listings/mine');
      setActiveListings(r.data || []);
    } catch {
      // Fallback if backend hasn't been restarted yet (route missing)
      const r2 = await api.get(`/listings/user/${me._id}`);
      setActiveListings(r2.data || []);
    }
  }, [isOwn, me?._id]);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    const fetchListings = async () => {
      if (!isOwn) return api.get(`/listings/user/${targetId}`);
      try {
        return await api.get('/listings/mine');
      } catch {
        // Fallback if backend hasn't been restarted yet (route missing)
        return await api.get(`/listings/user/${targetId}`);
      }
    };

    const fetches = [
      api.get(`/users/${targetId}`).then(r => setProfile(r.data)),
      fetchListings().then(r => setActiveListings(r.data)),
      api.get(`/reviews/user/${targetId}`).then(r => setReviews(r.data)),
    ];
    if (isOwn) {
      fetches.push(api.get('/users/me/saved').then(r => setSavedListings(r.data)));
      fetches.push(api.get('/orders').then(r => setOrders(r.data)));
      fetches.push(
        api.get('/orders/sales')
          .then(r => setSales(r.data || []))
          .catch(() => setSales([]))
      );
      fetches.push(
        api.get('/reviews/mine')
          .then(r => setMyReviews(r.data || []))
          .catch(() => setMyReviews([]))
      );
    }
    Promise.all(fetches).catch(() => {}).finally(() => setLoading(false));
  }, [targetId, isOwn]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size={32} />
    </div>
  );
  if (!profile) return null;

  const pendingOrders   = orders.filter(o => o.status === 'placed' || o.status === 'confirmed');
  const completedOrders = orders.filter(o => o.status === 'picked_up' || o.status === 'auto_closed');
  const pendingSales    = sales.filter(o => o.status === 'placed' || o.status === 'confirmed');
  const completedSales  = sales.filter(o => o.status === 'picked_up' || o.status === 'auto_closed');
  // Reviewed orders, separated by direction (buyer-to-seller vs seller-to-buyer)
  const reviewedAsBuyer = new Set(
    myReviews.filter(r => (r.direction || 'buyer_to_seller') === 'buyer_to_seller').map(r => String(r.order))
  );
  const reviewedAsSeller = new Set(
    myReviews.filter(r => r.direction === 'seller_to_buyer').map(r => String(r.order))
  );

  const myActiveListings = isOwn
    ? activeListings.filter((l) => l.status === 'active')
    : activeListings;
  const mySoldListings = isOwn
    ? activeListings.filter((l) => l.status === 'sold')
    : [];
  const myUnlistedListings = isOwn
    ? activeListings.filter((l) => l.status === 'archived')
    : [];

  const confirmPickupAsParty = async (orderId) => {
    setOrderBusyId(orderId);
    try {
      const r = await api.post(`/orders/${orderId}/confirm-pickup`, { confirmed: true });
      setOrders(prev => prev.map(o => o._id === orderId ? r.data : o));
      setSales(prev => prev.map(o => o._id === orderId ? r.data : o));
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not confirm pickup.');
    } finally {
      setOrderBusyId(null);
    }
  };

  const openReviewForOrder = (order, role) => {
    setReviewRole(role);
    setReviewTarget(order);
  };

  const onReviewSubmitted = (review) => {
    setMyReviews(prev => [review, ...prev]);
    // Also refresh the public reviews list if the buyer is viewing their own
    // profile and just reviewed a seller — though that only matters when the
    // current user is the reviewee, which can't happen here. Safe no-op.
  };

  const updateStatus = async (id, status) => {
    const label =
      status === 'sold' ? 'mark this listing as SOLD' :
      status === 'archived' ? 'unlist this item' :
      'relist this item';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    await api.patch(`/listings/${id}`, { status });
    await refreshMine();
  };

  const removeListing = async (id) => {
    if (!window.confirm('Delete/remove this listing?')) return;
    await api.delete(`/listings/${id}`);
    await refreshMine();
  };

  const tabs = [
    { id: 'selling', label: 'Selling', count: myActiveListings.length },
    ...(isOwn ? [{ id: 'unlisted', label: 'Unlisted', count: myUnlistedListings.length }] : []),
    ...(isOwn ? [{ id: 'orders', label: 'Orders', count: orders.length }] : []),
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
            <button className="btn btn-secondary btn-sm" onClick={() => setEditOpen(true)}>Edit profile</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/sell')}>+ Post listing</button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/complaints')}
            >
              <Warning style={{ width: 14, height: 14 }} /> Complaints
            </button>
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
          myActiveListings.length ? (
            <div className="feed-grid">
              {myActiveListings.map(l => (
                <div key={l._id} className="my-listing-wrap">
                  <ListingCard listing={l} />
                  {isOwn && (
                    <div className="my-listing-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => updateStatus(l._id, 'sold')}>
                        Mark sold
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(l._id, 'archived')}>
                        Unlist
                      </button>
                      <button className="btn btn-secondary btn-sm danger" onClick={() => removeListing(l._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><Tag /></div>
              <h3>No active listings</h3>
              <p>{isOwn ? 'Tap + to post your first item.' : 'No active listings right now.'}</p>
            </div>
          )
        )}

        {tab === 'unlisted' && isOwn && (
          myUnlistedListings.length ? (
            <div className="feed-grid">
              {myUnlistedListings.map(l => (
                <div key={l._id} className="my-listing-wrap">
                  <ListingCard listing={l} />
                  <div className="my-listing-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => updateStatus(l._id, 'active')}>
                      Relist
                    </button>
                    <button className="btn btn-secondary btn-sm danger" onClick={() => removeListing(l._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ico"><Tag /></div>
              <h3>No unlisted items</h3>
              <p>Listings you unlist will appear here.</p>
            </div>
          )
        )}

        {tab === 'orders' && isOwn && (
          <div className="orders-tab-wrap">
            <div className="orders-subtabs" style={{ marginBottom: 10 }}>
              <button
                type="button"
                className={`orders-subtab${orderRole === 'buy' ? ' active' : ''}`}
                onClick={() => setOrderRole('buy')}
              >
                Purchases
                <span className="orders-subtab-count">{orders.length}</span>
              </button>
              <button
                type="button"
                className={`orders-subtab${orderRole === 'sell' ? ' active' : ''}`}
                onClick={() => setOrderRole('sell')}
              >
                Sales
                <span className="orders-subtab-count">{sales.length}</span>
              </button>
            </div>

            <div className="orders-subtabs">
              <button
                type="button"
                className={`orders-subtab${ordersFilter === 'pending' ? ' active' : ''}`}
                onClick={() => setOrdersFilter('pending')}
              >
                <Clock style={{ width: 14, height: 14 }} /> Pending
                <span className="orders-subtab-count">{pendingOrders.length}</span>
              </button>
              <button
                type="button"
                className={`orders-subtab${ordersFilter === 'completed' ? ' active' : ''}`}
                onClick={() => setOrdersFilter('completed')}
              >
                <Check style={{ width: 14, height: 14 }} /> Completed
                <span className="orders-subtab-count">{completedOrders.length}</span>
              </button>
            </div>

            {(() => {
              const isBuyRole = orderRole === 'buy';
              const pendingList = isBuyRole ? pendingOrders : pendingSales;
              const completedList = isBuyRole ? completedOrders : completedSales;
              const list = ordersFilter === 'pending' ? pendingList : completedList;
              if (!list.length) {
                return (
                  <div className="empty">
                    <div className="ico">{ordersFilter === 'pending' ? <Clock /> : <Check />}</div>
                    <h3>
                      {ordersFilter === 'pending'
                        ? (isBuyRole ? 'No pending purchases' : 'No pending sales')
                        : (isBuyRole ? 'No completed purchases' : 'No completed sales')}
                    </h3>
                    <p>
                      {ordersFilter === 'pending'
                        ? (isBuyRole
                          ? 'Orders you have placed but not yet completed will appear here.'
                          : 'Orders from buyers who still need pickup confirmation will appear here.')
                        : (isBuyRole
                          ? 'Completed purchases appear here, where you can review sellers.'
                          : 'Completed sales appear here, where you can review buyers.')}
                    </p>
                  </div>
                );
              }
              return (
                <div className="order-card-list">
                  {list.map(order => {
                    const firstItem = order.items?.[0];
                    const seller = firstItem?.listing?.seller;
                    const sellerName = seller?.name || firstItem?.sellerName || 'Seller';
                    const buyerName = order.buyer?.name || 'Buyer';
                    const reviewed = isBuyRole
                      ? reviewedAsBuyer.has(String(order._id))
                      : reviewedAsSeller.has(String(order._id));
                    const buyerConfirmed = !!order.pickupConfirmation?.buyerConfirmedAt;
                    const sellerConfirmed = !!order.pickupConfirmation?.sellerConfirmedAt;
                    return (
                      <div key={order._id} className="order-card">
                        <button
                          type="button"
                          className="order-card-body"
                          onClick={() => navigate(`/order/${order._id}`)}
                        >
                          <div className="order-card-top">
                            <span className="mono order-card-num">{order.orderNumber}</span>
                            <span className={`admin-badge ${order.status}`}>
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="order-card-items">
                            {order.items.map((it, i) => (
                              <div key={i} className="order-card-item-row">
                                <span className="order-card-item-title">{it.title}</span>
                                {it.qty > 1 && <span className="order-card-item-qty">× {it.qty}</span>}
                              </div>
                            ))}
                          </div>
                          <div className="order-card-meta">
                            <span>
                              {isBuyRole ? (
                                <>Sold by <strong>{sellerName}</strong></>
                              ) : (
                                <>Bought by <strong>{buyerName}</strong></>
                              )}
                            </span>
                            <span>· {order.pickupSlot}</span>
                          </div>
                          <div className="order-card-foot">
                            <span className="order-card-date">{fmtDate(order.createdAt)}</span>
                            <span className="order-card-total mono">{fmtPrice(order.total)}</span>
                          </div>
                        </button>

                        <div className="order-card-actions">
                          {ordersFilter === 'pending' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={orderBusyId === order._id}
                              onClick={() => confirmPickupAsParty(order._id)}
                            >
                              {orderBusyId === order._id
                                ? 'Saving…'
                                : (isBuyRole ? 'I picked it up' : 'Buyer picked it up')}
                            </button>
                          )}
                          {ordersFilter === 'pending' && !isBuyRole && (
                            <span className="order-reviewed-pill" style={{ marginLeft: 8 }}>
                              {buyerConfirmed ? 'Buyer confirmed' : 'Buyer pending'} · {sellerConfirmed ? 'You confirmed' : 'You pending'}
                            </span>
                          )}
                          {ordersFilter === 'completed' && (
                            reviewed ? (
                              <span className="order-reviewed-pill">
                                <Star style={{ width: 12, height: 12 }} /> Review posted
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => openReviewForOrder(order, isBuyRole ? 'buyer' : 'seller')}
                                disabled={isBuyRole ? !seller?._id : !order.buyer?._id}
                                title={isBuyRole
                                  ? (!seller?._id ? 'Seller info unavailable for this order.' : undefined)
                                  : (!order.buyer?._id ? 'Buyer info unavailable for this order.' : undefined)}
                              >
                                <Star style={{ width: 13, height: 13 }} /> Leave review
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/order/${order._id}`)}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
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

      {isOwn && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onSaved={(updated) => setProfile(p => ({ ...p, ...updated }))}
        />
      )}

      {isOwn && (
        <ReviewModal
          open={!!reviewTarget}
          order={reviewTarget}
          role={reviewRole}
          onClose={() => setReviewTarget(null)}
          onSubmitted={onReviewSubmitted}
        />
      )}
    </div>
  );
}
