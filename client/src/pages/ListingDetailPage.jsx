import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft, Heart, HeartO, Share, Tag, Eye, Clock, Pin,
  Verified, ChevR, CheckCirc, Cart,
} from '../components/ui/Icon';
import { fmtPrice, fmtRelativeTime } from '../utils/format';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, savedSet, toggleSave } = useAuth();
  const { addToCart, inCart } = useCart();
  const { toast, showToast, dismissToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galIdx, setGalIdx] = useState(0);

  useEffect(() => {
    api.get(`/listings/${id}`)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner size={36} />
    </div>
  );
  if (!listing) return null;

  const seller = listing.seller;
  const saved = savedSet.has(listing._id);
  const already = inCart(listing._id);
  const isOwnListing = !!(user && seller && user._id === seller._id);
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

  const sendOffer = (pct) => {
    const amount = Math.round(listing.price * (1 - pct / 100));
    showToast({ msg: `Offer of ${fmtPrice(amount)} sent to ${seller?.name?.split(' ')[0]}` });
  };

  const prevPhoto = () => setGalIdx(i => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setGalIdx(i => (i + 1) % photos.length);

  return (
    <div className="view" style={{ paddingBottom: 8 }}>
      <div className="detail-gallery">
        {photos.map((src, i) => (
          <div key={i} className={`gal ${galIdx === i ? 'active' : ''}`}>
            {src ? (
              <img src={src} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="ph ph-teal" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(15,26,26,0.5)', letterSpacing: '0.06em' }}>
                  {listing.title.split(' ').slice(0, 3).join(' ')}
                </span>
              </div>
            )}
          </div>
        ))}

        <button className="nav-back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft />
        </button>

        <div className="nav-actions">
          <button className="ga-btn" aria-label="Share" onClick={() => navigator.share?.({ title: listing.title, url: window.location.href })}>
            <Share />
          </button>
          <button className={`ga-btn ${saved ? 'saved' : ''}`} onClick={handleSave} aria-label={saved ? 'Unsave' : 'Save'}>
            {saved ? <Heart /> : <HeartO />}
          </button>
        </div>

        <div className="badges-detail">
          {listing.moveOut && <span className="badge move-out"><Tag /> Move-Out Sale</span>}
          {showCourse && <span className="badge course">{listing.courseCode}</span>}
          {listing.openOffers && <span className="badge offers">Open to offers</span>}
        </div>

        {photos.length > 1 && (
          <div className="dots">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`dot ${galIdx === i ? 'active' : ''}`}
                onClick={() => setGalIdx(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="detail-body">
        <div className="detail-price-row">
          <div>
            <div className="detail-price">{fmtPrice(listing.price)}</div>
            {listing.oldPrice && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                <span style={{ textDecoration: 'line-through' }}>{fmtPrice(listing.oldPrice)}</span>
                <span style={{ color: 'var(--coral)', fontWeight: 700, marginLeft: 8 }}>
                  -{Math.round((1 - listing.price / listing.oldPrice) * 100)}%
                </span>
              </div>
            )}
          </div>
          <span className="badge condition" style={{ height: 26, fontSize: 11.5 }}>{listing.condition}</span>
        </div>

        <h1 className="detail-title">{listing.title}</h1>

        <div className="detail-meta">
          <span><Eye /> {listing.views} views</span>
          <span><HeartO /> {listing.savedCount} saved</span>
          <span><Clock /> {fmtRelativeTime(listing.createdAt)}</span>
        </div>

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

        {listing.openOffers && listing.status === 'active' && (
          <div className="detail-section">
            <h4>Quick offer</h4>
            <div className="offer-row">
              {[5, 10, 15].map(p => (
                <button key={p} className="offer-chip" onClick={() => sendOffer(p)}>
                  <span className="pct">−{p}%</span>
                  {fmtPrice(Math.round(listing.price * (1 - p / 100)))}
                </button>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
              Offers are binding for 24 hours if accepted.
            </p>
          </div>
        )}
      </div>

      {listing.status === 'active' && (
        <div className="cta-bar">
          <button
            className={`heart-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            {saved ? <Heart /> : <HeartO />}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => showToast({ msg: `Message feature coming soon` })}
          >
            Message
          </button>
          <button
            className="btn btn-primary"
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
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
