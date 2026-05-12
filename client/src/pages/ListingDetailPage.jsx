import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import {
  ArrowLeft, Heart, HeartO, Share, Tag, Eye, Clock, Pin,
  Verified, ChevR, CheckCirc, Cart, X, Send,
} from '../components/ui/Icon';
import { fmtPrice, fmtRelativeTime, fmtDateTime } from '../utils/format';
import { PICKUP_LOCATIONS } from '../utils/constants';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, savedSet, toggleSave } = useAuth();
  const { addToCart, inCart } = useCart();
  const { toast, showToast, dismissToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galIdx, setGalIdx] = useState(0);
  const [openingChat, setOpeningChat] = useState(false);

  // Offers
  const [myOffer, setMyOffer] = useState(null);
  const [sellerOffers, setSellerOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [customOffer, setCustomOffer] = useState(''); // digits only (amount)
  const [customOfferErr, setCustomOfferErr] = useState(null);

  // Pickup requests (seller-side view)
  const [sellerPickupRequests, setSellerPickupRequests] = useState([]);
  const [pickupBusyId, setPickupBusyId] = useState(null);
  const [pickupCounters, setPickupCounters] = useState({}); // pr._id -> { time, location }

  // Reviews (buyer after pickup)
  const [reviewEligible, setReviewEligible] = useState(null); // { orderId } | null
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Chat popup state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const chatThreadRef = useRef(null);

  const scrollChatToBottom = useCallback(() => {
    const el = chatThreadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    api.get(`/listings/${id}`)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!listing?._id || !user?._id) return;
    const sellerId = listing?.seller?._id;
    const isOwn = sellerId && String(user._id) === String(sellerId);
    setOffersLoading(true);
    const listingId = String(listing._id);
    const reqs = isOwn
      ? [
          api.get(`/offers/listing/${listingId}`).then(r => setSellerOffers(r.data || [])).catch(() => setSellerOffers([])),
          api.get(`/pickup-requests/listing/${listingId}`).then(r => setSellerPickupRequests(r.data || [])).catch(() => setSellerPickupRequests([])),
        ]
      : [api.get(`/offers/listing/${listingId}/mine`).then(r => setMyOffer(r.data || null)).catch(() => setMyOffer(null))];
    Promise.all(reqs).finally(() => setOffersLoading(false));
  }, [listing?._id, listing?.seller?._id, user?._id]);

  // Poll seller-side pickup requests so they see fresh buyer counters live.
  useEffect(() => {
    if (!listing?._id || !user?._id) return;
    const sellerId = listing?.seller?._id;
    const isOwn = sellerId && String(user._id) === String(sellerId);
    if (!isOwn) return;
    const listingId = String(listing._id);
    const t = setInterval(() => {
      api.get(`/pickup-requests/listing/${listingId}`)
        .then(r => setSellerPickupRequests(r.data || []))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [listing?._id, listing?.seller?._id, user?._id]);

  // Refresh buyer offer state (accepted/rejected) after seller action
  useEffect(() => {
    if (!listing?._id || !user?._id) return;
    const sellerId = listing?.seller?._id;
    const isOwn = sellerId && String(user._id) === String(sellerId);
    if (isOwn) return;
    if (!myOffer || myOffer.status !== 'sent') return;
    const listingId = String(listing._id);
    const t = setInterval(() => {
      api.get(`/offers/listing/${listingId}/mine`)
        .then((r) => setMyOffer(r.data || null))
        .catch(() => {});
    }, 6000);
    return () => clearInterval(t);
  }, [listing?._id, listing?.seller?._id, user?._id, myOffer?.status]);

  useEffect(() => {
    if (!listing?._id || !user?._id) { setReviewEligible(null); return; }
    const sellerId = listing?.seller?._id;
    if (sellerId && String(user._id) === String(sellerId)) { setReviewEligible(null); return; }
    api.get('/orders')
      .then((r) => {
        const orders = r.data || [];
        const hit = orders.find((o) =>
          o.status === 'picked_up' && (o.items || []).some((it) => String(it.listing?._id || it.listing) === String(listing._id))
        );
        setReviewEligible(hit ? { orderId: hit._id } : null);
      })
      .catch(() => setReviewEligible(null));
  }, [listing?._id, listing?.seller?._id, user?._id]);

  // Poll for new messages while popup is open
  useEffect(() => {
    if (!chatOpen || !chatId) return;
    const t = setInterval(() => {
      api.get(`/conversations/${chatId}/messages`)
        .then((r) => setChatMessages(r.data || []))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [chatOpen, chatId]);

  useEffect(() => { scrollChatToBottom(); }, [chatMessages, scrollChatToBottom]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size={36} />
    </div>
  );
  if (!listing) return null;

  const seller = listing.seller;
  const saved = savedSet.has(listing._id);
  const already = inCart(listing._id);
  const isOwnListing = !!(user && seller && String(user._id) === String(seller._id));
  const showCourse = listing.courseCode && listing.category === 'Textbooks';

  const photos = listing.photos?.length ? listing.photos : [null];

  const handleSave = () => {
    if (!user) { navigate('/login'); return; }
    const wasSaved = saved;
    toggleSave(listing._id);
    showToast({ msg: wasSaved ? 'Removed from Saved' : 'Saved to your wishlist' });
  };

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (isOwnListing) { showToast({ msg: "You can't buy your own listing" }); return; }
    if (already) { showToast({ msg: 'Already in your cart' }); return; }
    addToCart(listing);
    showToast({ msg: `Added to cart · ${listing.title}` });
  };

  const handleCheckout = () => {
    if (!user) { navigate('/login'); return; }
    if (isOwnListing) { showToast({ msg: "You can't checkout your own listing" }); return; }
    if (!already) addToCart(listing);
    navigate('/checkout');
  };

  const openSellerChat = async () => {
    if (!user) { navigate('/login'); return; }
    if (isOwnListing) { navigate('/inbox'); return; }
    const listingId = listing._id ?? listing.id;
    if (!listingId) { showToast({ msg: 'Invalid listing' }); return; }
    setOpeningChat(true);
    try {
      const { data } = await api.post('/conversations', { listingId: String(listingId) });
      const cid = data?._id ?? data?.id;
      if (!cid) { showToast({ msg: 'Could not start chat.' }); return; }
      setChatId(cid);
      setChatOpen(true);
      setChatLoading(true);
      const r = await api.get(`/conversations/${cid}/messages`);
      setChatMessages(r.data || []);
    } catch (e) {
      showToast({ msg: e.response?.data?.message || e.message || 'Could not open chat' });
    } finally {
      setOpeningChat(false);
      setChatLoading(false);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text || chatSending || !chatId) return;
    setChatSending(true);
    try {
      await api.post(`/conversations/${chatId}/messages`, { body: text });
      const r = await api.get(`/conversations/${chatId}/messages`);
      setChatMessages(r.data || []);
      setChatDraft('');
    } catch (e2) {
      showToast({ msg: e2.response?.data?.message || 'Could not send.' });
    } finally {
      setChatSending(false);
    }
  };

  const sendOffer = async (pct) => {
    if (!user) { navigate('/login'); return; }
    if (isOwnListing) { showToast({ msg: "You can't send an offer on your own listing" }); return; }
    if (myOffer) { showToast({ msg: 'Offer already sent for this listing' }); return; }
    try {
      const { data } = await api.post('/offers', { listingId: String(listing._id), pct });
      setMyOffer(data);
      showToast({ msg: `Offer sent · ${fmtPrice(data.amount)}` });
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not send offer' });
    }
  };

  const sendCustomOffer = async () => {
    const raw = (customOffer || '').replace(/\D/g, '');
    const amount = Number(raw);
    const price = Number(listing.price);
    if (!Number.isFinite(amount) || amount <= 0) { setCustomOfferErr('Enter an amount.'); return; }
    if (!Number.isFinite(price) || price <= 0) { setCustomOfferErr('Invalid product price.'); return; }
    if (amount >= price) { setCustomOfferErr('Offer must be less than the product price.'); return; }

    setCustomOfferErr(null);
    if (!user) { navigate('/login'); return; }
    if (isOwnListing) { showToast({ msg: "You can't send an offer on your own listing" }); return; }
    if (myOffer) { showToast({ msg: 'Offer already sent for this listing' }); return; }
    try {
      const { data } = await api.post('/offers', { listingId: String(listing._id), amount });
      setMyOffer(data);
      showToast({ msg: `Offer sent · ${fmtPrice(data.amount)}` });
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not send offer' });
    }
  };

  const refreshSellerPickups = async () => {
    if (!listing?._id) return;
    try {
      const r = await api.get(`/pickup-requests/listing/${String(listing._id)}`);
      setSellerPickupRequests(r.data || []);
    } catch {
      // ignore — UI keeps previous state
    }
  };

  const acceptPickupRequest = async (prId) => {
    setPickupBusyId(prId);
    try {
      await api.patch(`/pickup-requests/${prId}/accept`, {});
      showToast({ msg: 'Pickup time accepted — buyer can pay now.' });
      await refreshSellerPickups();
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not accept pickup.' });
    } finally {
      setPickupBusyId(null);
    }
  };

  const counterPickupRequest = async (prId) => {
    const draft = pickupCounters[prId] || {};
    if (!draft.time) {
      showToast({ msg: 'Pick a date and time first.' });
      return;
    }
    const when = new Date(draft.time);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 15 * 60_000) {
      showToast({ msg: 'Pick a time at least 15 minutes from now.' });
      return;
    }
    setPickupBusyId(prId);
    try {
      await api.patch(`/pickup-requests/${prId}/counter`, {
        time: when.toISOString(),
        location: draft.location || '',
      });
      showToast({ msg: 'Counter sent to buyer.' });
      setPickupCounters((m) => ({ ...m, [prId]: { time: '', location: draft.location || '' } }));
      await refreshSellerPickups();
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not counter.' });
    } finally {
      setPickupBusyId(null);
    }
  };

  const updateOfferStatus = async (offerId, status) => {
    try {
      await api.patch(`/offers/${offerId}`, { status });
      const r = await api.get(`/offers/listing/${String(listing._id)}`);
      setSellerOffers(r.data || []);
      showToast({ msg: status === 'accepted' ? 'Offer accepted' : 'Offer rejected' });
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not update offer' });
    }
  };

  const submitReview = async () => {
    if (!reviewEligible?.orderId || !seller?._id) return;
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await api.post('/reviews', {
        revieweeId: seller._id,
        listingId: listing._id,
        orderId: reviewEligible.orderId,
        stars: reviewStars,
        text: reviewText.trim(),
      });
      showToast({ msg: 'Review submitted. Thank you!' });
      setReviewOpen(false);
      setReviewText('');
    } catch (e) {
      showToast({ msg: e.response?.data?.message || 'Could not submit review' });
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="page">
      <TopBar onBack={() => navigate(-1)} title={listing.title} className="topbar--detail" right={
        <>
          <button className="ga-btn" aria-label="Share" onClick={() => navigator.share?.({ title: listing.title, url: window.location.href })}>
            <Share />
          </button>
          <button className={`ga-btn ${saved ? 'saved' : ''}`} onClick={handleSave} aria-label={saved ? 'Unsave' : 'Save'}>
            {saved ? <Heart /> : <HeartO />}
          </button>
        </>
      } />

      <div className="view detail-page-view">
        <div className="detail-layout">
          {/* ── LEFT: Gallery ────────────────────────────── */}
          <div className="detail-left">
            <div className="detail-gallery-v2">
              <div className="detail-main-img">
                {photos[galIdx] ? (
                  <img src={photos[galIdx]} alt={listing.title} />
                ) : (
                  <div className="ph ph-teal" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(15,26,26,0.45)', letterSpacing: '0.06em' }}>
                      {listing.title.split(' ').slice(0, 3).join(' ')}
                    </span>
                  </div>
                )}
              </div>

              {photos.length > 1 && (
                <div className="detail-thumbs">
                  {photos.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`detail-thumb ${galIdx === i ? 'active' : ''}`}
                      onClick={() => setGalIdx(i)}
                    >
                      {src ? (
                        <img src={src} alt="" />
                      ) : (
                        <div className="ph ph-teal" style={{ width: '100%', height: '100%' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="detail-badges">
                {listing.moveOut && <span className="badge move-out"><Tag /> Move-Out Sale</span>}
                {showCourse && <span className="badge course">{listing.courseCode}</span>}
                {listing.openOffers && <span className="badge offers">Open to offers</span>}
              </div>
            </div>

            {/* Description & specs live under the gallery on desktop */}
            <div className="detail-desc-desktop">
              {listing.description && (
                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{listing.description}</p>
                </div>
              )}

              {listing.specs?.length > 0 && (
                <div className="detail-section">
                  <h4>Details</h4>
                  <div className="detail-specs">
                    {listing.specs.map(([k, v]) => (
                      <div key={k} className="spec">
                        <div className="k">{k}</div>
                        <div className="v">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Info panel ────────────────────────── */}
          <div className="detail-right">
            <div className="detail-right-inner">
              <div className="detail-price-row">
                <div>
                  <div className="detail-price">{fmtPrice(listing.price)}</div>
                  {listing.oldPrice && (
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      <span style={{ textDecoration: 'line-through' }}>{fmtPrice(listing.oldPrice)}</span>
                      <span style={{ color: 'var(--red)', fontWeight: 700, marginLeft: 8 }}>
                        -{Math.round((1 - listing.price / listing.oldPrice) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <h1 className="detail-title">{listing.title}</h1>

              <div
                className="detail-condition-line"
                style={{
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>Condition:</span>
                <span className="badge condition" style={{ height: 24, fontSize: 11.5 }}>
                  {listing.condition}
                </span>
              </div>

              <div className="detail-meta">
                <span><Eye /> {listing.views} views</span>
                <span><HeartO /> {listing.savedCount} saved</span>
                <span><Clock /> {fmtRelativeTime(listing.createdAt)}</span>
              </div>

              {/* Description & specs inline on mobile only */}
              <div className="detail-desc-mobile">
                {listing.description && (
                  <div className="detail-section">
                    <h4>Description</h4>
                    <p>{listing.description}</p>
                  </div>
                )}
                {listing.specs?.length > 0 && (
                  <div className="detail-section">
                    <h4>Details</h4>
                    <div className="detail-specs">
                      {listing.specs.map(([k, v]) => (
                        <div key={k} className="spec">
                          <div className="k">{k}</div>
                          <div className="v">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {listing.status === 'active' && (
                <div className="detail-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleAddToCart}
                    disabled={listing.status !== 'active' || isOwnListing}
                  >
                    {isOwnListing
                      ? 'Your listing'
                      : already
                        ? <><CheckCirc /> In cart</>
                        : <><Cart /> Add to cart</>
                    }
                  </button>
                  {!isOwnListing && (
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={handleCheckout}
                      style={{ background: 'linear-gradient(135deg, var(--teal-700), var(--teal-500))' }}
                    >
                      Checkout
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    disabled={openingChat}
                    onClick={openSellerChat}
                  >
                    {openingChat ? 'Opening…' : 'Message'}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-block detail-save-btn ${saved ? 'saved' : ''}`}
                    onClick={handleSave}
                  >
                    {saved ? <><Heart /> Saved</> : <><HeartO /> Save to wishlist</>}
                  </button>
                </div>
              )}

              {/* Seller */}
              {seller && (
                <div className="detail-section">
                  <h4>Seller</h4>
                  <button
                    className="seller-card"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => navigate(`/profile/${seller._id}`)}
                  >
                    <div className="avatar av-teal">
                      {seller.avatarUrl
                        ? <img src={seller.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : seller.name?.[0]?.toUpperCase()
                      }
                    </div>
                    <div className="info">
                      <div className="nm">
                        {seller.name}
                        <Verified style={{ width: 14, height: 14, color: 'var(--teal-700)' }} />
                      </div>
                      <div className="meta">
                        {seller.dept && `${seller.dept} · `}
                        {seller.batch && `Batch '${seller.batch.slice(2)} · `}
                        ★ {seller.rating?.toFixed(1) || '—'} ({seller.reviewCount || 0} reviews)
                      </div>
                    </div>
                    <span className="arr"><ChevR /></span>
                  </button>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--teal-50)', border: '1px solid var(--teal-100)', borderRadius: 12, fontSize: 12, color: 'var(--teal-900)' }}>
                    <Verified style={{ width: 16, height: 16, color: 'var(--teal-700)', flexShrink: 0 }} />
                    <span><strong>Verified GIKI student.</strong> Signed up with @giki.edu.pk email.</span>
                  </div>
                </div>
              )}

              {/* Pickup */}
              <div className="detail-section">
                <h4>Pickup</h4>
                <div className="pickup-card">
                  <div className="head">
                    <span className="pin"><Pin /></span>
                    <div className="info">
                      <div className="ttl">{listing.pickup}</div>
                      <div className="sub">Cash on pickup. Meet in a public spot on campus.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review */}
              {reviewEligible && (
                <div className="detail-section">
                  <h4>Review</h4>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    If you picked this up already, you can leave a review for the seller.
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 10, height: 46, width: '100%' }}
                    onClick={() => setReviewOpen(true)}
                  >
                    Write a review
                  </button>
                </div>
              )}

              {/* Pickup requests (seller view) */}
              {isOwnListing && sellerPickupRequests.length > 0 && (
                <div className="detail-section">
                  <h4>Pickup requests</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sellerPickupRequests.map((pr) => {
                      const last = pr.proposals?.[pr.proposals.length - 1];
                      const awaitsMe = pr.status === 'pending' && pr.awaitingFrom === 'seller';
                      const draft = pickupCounters[pr._id] || { time: '', location: PICKUP_LOCATIONS[0] };
                      return (
                        <div key={pr._id} className="seller-pickup-card">
                          <div className="seller-pickup-top">
                            <div style={{ fontWeight: 700 }}>{pr.buyer?.name || 'Buyer'}</div>
                            <span className={`admin-badge ${pr.status}`} style={{ textTransform: 'uppercase' }}>
                              {pr.status}
                            </span>
                          </div>

                          <div className="negotiation-history" style={{ margin: '8px 0' }}>
                            {pr.proposals.map((p, i) => (
                              <div key={i} className={`neg-row ${p.byRole}`}>
                                <div className="neg-row-by">
                                  <strong>{p.byRole === 'buyer' ? 'Buyer proposed' : 'You proposed'}</strong>
                                  <span className="neg-row-when">{fmtDateTime(p.at)}</span>
                                </div>
                                <div className="neg-row-time">{fmtDateTime(p.time)}</div>
                                {p.location && <div className="neg-row-loc"><Pin style={{ width: 11, height: 11 }} /> {p.location}</div>}
                                {p.note && <div className="neg-row-note">"{p.note}"</div>}
                              </div>
                            ))}
                          </div>

                          {pr.status === 'accepted' && (
                            <div className="negotiation-locked">
                              <CheckCirc style={{ width: 18, height: 18, color: 'var(--teal-700)' }} />
                              <div>
                                <div style={{ fontWeight: 700 }}>{fmtDateTime(pr.acceptedTime)}</div>
                                {pr.acceptedLocation && (
                                  <div className="negotiation-locked-sub"><Pin style={{ width: 11, height: 11 }} /> {pr.acceptedLocation}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {awaitsMe && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-block"
                                style={{ marginTop: 6, height: 44 }}
                                disabled={pickupBusyId === pr._id}
                                onClick={() => acceptPickupRequest(pr._id)}
                              >
                                Accept {last ? fmtDateTime(last.time) : ''}
                              </button>
                              <div className="field" style={{ marginTop: 10 }}>
                                <label>Counter with a different time</label>
                                <input
                                  type="datetime-local"
                                  className="input"
                                  value={draft.time || ''}
                                  onChange={(e) =>
                                    setPickupCounters((m) => ({
                                      ...m,
                                      [pr._id]: { ...draft, time: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="field">
                                <label>Pickup location</label>
                                <select
                                  className="input"
                                  value={draft.location || PICKUP_LOCATIONS[0]}
                                  onChange={(e) =>
                                    setPickupCounters((m) => ({
                                      ...m,
                                      [pr._id]: { ...draft, location: e.target.value },
                                    }))
                                  }
                                >
                                  {PICKUP_LOCATIONS.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                className="btn btn-secondary btn-block"
                                style={{ height: 44 }}
                                disabled={pickupBusyId === pr._id || !draft.time}
                                onClick={() => counterPickupRequest(pr._id)}
                              >
                                Send counter
                              </button>
                            </>
                          )}

                          {pr.status === 'pending' && pr.awaitingFrom === 'buyer' && (
                            <div className="negotiation-hint">
                              You countered — waiting on the buyer to accept or reply.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick offer */}
              {listing.openOffers && listing.status === 'active' && (
                <div className="detail-section">
                  <h4>Quick offer</h4>
                  {isOwnListing ? (
                    offersLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}><Spinner size={22} /></div>
                    ) : sellerOffers.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>No offers received for this listing yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sellerOffers.map((o) => (
                          <div key={o._id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, color: 'var(--ink)' }}>
                                {fmtPrice(o.amount)} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>({`-${o.pct}%`})</span>
                              </div>
                              <span className={`admin-badge ${o.status}`} style={{ textTransform: 'uppercase' }}>{o.status}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                              Buyer: <strong>{o.buyer?.name || '—'}</strong> · {o.buyer?.email || '—'}
                            </div>
                            {o.status === 'sent' && (
                              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={() => updateOfferStatus(o._id, 'rejected')}>
                                  Reject
                                </button>
                                <button type="button" className="btn btn-primary" style={{ flex: 1, height: 44 }} onClick={() => updateOfferStatus(o._id, 'accepted')}>
                                  Accept
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <>
                      <div className="offer-row" style={{ opacity: myOffer ? 0.55 : 1 }}>
                        {[5, 10, 15].map(p => (
                          <button
                            key={p}
                            className="offer-chip"
                            onClick={() => sendOffer(p)}
                            disabled={!!myOffer}
                            aria-disabled={!!myOffer}
                          >
                            <span className="pct">−{p}%</span>
                            {fmtPrice(Math.round(listing.price * (1 - p / 100)))}
                          </button>
                        ))}
                      </div>

                      {/* Custom offer */}
                      <div style={{ marginTop: 10, opacity: myOffer ? 0.55 : 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 6 }}>
                          Custom offer
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <input
                              className={`input ${customOfferErr ? 'error' : ''}`}
                              placeholder={`Enter amount (max ${fmtPrice(Number(listing.price) - 1)})`}
                              value={customOffer}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={!!myOffer}
                              onChange={(e) => {
                                const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 9);
                                const max = Math.max(0, Number(listing.price) - 1);
                                const nextNum = digits ? Number(digits) : 0;
                                const next = nextNum > max ? String(max) : digits;
                                setCustomOffer(next);
                                setCustomOfferErr(null);
                              }}
                            />
                            {customOfferErr && (
                              <div className="err" style={{ marginTop: 6 }}>
                                {customOfferErr}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ height: 44, whiteSpace: 'nowrap' }}
                            disabled={!!myOffer}
                            onClick={sendCustomOffer}
                          >
                            Send
                          </button>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--muted)' }}>
                          Digits only. Offer must be lower than the listed price.
                        </div>
                      </div>

                      {myOffer && (
                        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--teal-900)', background: 'var(--teal-50)', border: '1px solid var(--teal-100)', borderRadius: 12, padding: '10px 12px' }}>
                          {myOffer.status === 'accepted' ? (
                            <>Offer accepted: <strong>{fmtPrice(myOffer.amount)}</strong> ({`-${myOffer.pct}%`}) · discount will apply at checkout</>
                          ) : myOffer.status === 'rejected' ? (
                            <>Offer rejected: <strong>{fmtPrice(myOffer.amount)}</strong> ({`-${myOffer.pct}%`})</>
                          ) : (
                            <>Offer sent: <strong>{fmtPrice(myOffer.amount)}</strong> ({`-${myOffer.pct}%`}) · waiting for seller response</>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
                    Offers are binding for 24 hours if accepted.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat popup ────────────────────────────────── */}
      {chatOpen && (
        <>
          <div className="chat-popup-overlay" onClick={() => setChatOpen(false)} />
          <div className="chat-popup">
            <div className="chat-popup-header">
              <div className="chat-popup-header-info">
                <div className="chat-popup-seller">{seller?.name || 'Seller'}</div>
              </div>
              <button type="button" className="chat-popup-close" onClick={() => setChatOpen(false)} aria-label="Close">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div className="chat-popup-product">
              <div className="chat-popup-product-img">
                {photos[0] ? (
                  <img src={photos[0]} alt="" />
                ) : (
                  <div className="ph ph-teal" style={{ width: '100%', height: '100%' }} />
                )}
              </div>
              <div className="chat-popup-product-info">
                <div className="chat-popup-product-title">{listing.title}</div>
                <div className="chat-popup-product-price">{fmtPrice(listing.price)}</div>
              </div>
            </div>

            <div className="chat-popup-thread" ref={chatThreadRef}>
              <div className="chat-thread-spacer" />
              {chatLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Spinner size={24} />
                </div>
              ) : chatMessages.length === 0 ? (
                <p className="chat-hint">Say hi — ask about condition, pickup, or price.</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m._id} className={`chat-bubble-wrap ${m.isMine ? 'mine' : 'theirs'}`}>
                    <div className={`chat-bubble ${m.isMine ? 'mine' : 'theirs'}`}>
                      {m.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form className="chat-popup-composer" onSubmit={sendChatMessage}>
              <input
                type="text"
                className="chat-popup-input"
                placeholder="Type a message…"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
              />
              <button
                type="submit"
                className="chat-send"
                disabled={chatSending || !chatDraft.trim()}
                aria-label="Send"
              >
                <Send style={{ width: 20, height: 20 }} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* ── Review modal ───────────────────────────────── */}
      {reviewOpen && (
        <>
          <div className="chat-popup-overlay" onClick={() => setReviewOpen(false)} />
          <div className="sheet" style={{ zIndex: 520 }}>
            <div className="sheet-hd">
              <div style={{ fontWeight: 800 }}>Write a review</div>
              <button type="button" className="sheet-x" onClick={() => setReviewOpen(false)} aria-label="Close"><X /></button>
            </div>
            <div className="sheet-body">
              <div className="field">
                <label>Rating</label>
                <select className="input" value={reviewStars} onChange={(e) => setReviewStars(Number(e.target.value))}>
                  {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} star{s === 1 ? '' : 's'}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Comment (optional)</label>
                <textarea
                  className="input"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was the pickup and item condition?"
                  style={{ height: 110, paddingTop: 12, resize: 'vertical' }}
                  maxLength={600}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 14, height: 52 }}
                disabled={reviewSubmitting}
                onClick={submitReview}
              >
                {reviewSubmitting ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
