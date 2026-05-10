import { useNavigate } from 'react-router-dom';
import { Heart, HeartO, Pin, Tag } from './Icon';
import { useAuth } from '../../contexts/AuthContext';
import { fmtPrice, fmtRelativeTime } from '../../utils/format';

export default function ListingCard({ listing, condensed, hideHeart }) {
  const navigate = useNavigate();
  const { savedSet, toggleSave, user } = useAuth();
  const saved = savedSet.has(listing._id);
  const showCourse = listing.courseCode && listing.category === 'Textbooks';

  const photoSrc = listing.photos?.[0] || null;
  const fallbackLabel = (listing.title || '').split(' ').slice(0, 2).join(' ');

  const handleSave = (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    toggleSave(listing._id);
  };

  return (
    <button className="card" onClick={() => navigate(`/listing/${listing._id}`)}>
      <div className="img-wrap">
        <div className="img">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={listing.title}
              className="card-img-fit"
              loading="lazy"
              onError={(e) => {
                // If the URL is broken, fall back to placeholder (without crashing render)
                e.currentTarget.style.display = 'none';
                const ph = e.currentTarget.parentElement?.querySelector?.('.ph');
                if (ph) ph.style.display = 'flex';
              }}
            />
          ) : (
            <div className="ph ph-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ padding: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--teal-700)' }}>
                {fallbackLabel}
              </span>
            </div>
          )}
          {/* Placeholder node for image error fallback */}
          {photoSrc && (
            <div className="ph ph-teal" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ padding: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--teal-700)' }}>
                {fallbackLabel}
              </span>
            </div>
          )}
          <div className="badge-row">
            {listing.moveOut && (
              <span className="badge move-out"><Tag style={{ width: 10, height: 10 }} /> Move-Out</span>
            )}
            {showCourse && (
              <span className="badge course">{listing.courseCode}</span>
            )}
            {listing.status === 'sold' && (
              <span className="badge sold">Sold</span>
            )}
          </div>
          {!hideHeart && (
            <div
              className={`heart ${saved ? 'saved' : ''}`}
              onClick={handleSave}
              role="button"
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              {saved ? <Heart /> : <HeartO />}
            </div>
          )}
        </div>
      </div>
      <div className="body">
        <div className="price-row">
          <span className="price">{fmtPrice(listing.price)}</span>
          {listing.openOffers && (
            <span className="offers-tag">OFFERS</span>
          )}
        </div>
        <p className="ttl">{listing.title}</p>
        {!condensed && (
          <div className="meta">
            <Pin />
            <span>{listing.pickup?.split(',')[0]}</span>
            <span>·</span>
            <span>{fmtRelativeTime(listing.createdAt)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
