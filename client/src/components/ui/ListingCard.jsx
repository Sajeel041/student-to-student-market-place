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

  const handleSave = (e) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    toggleSave(listing._id);
  };

  return (
    <button className="card" onClick={() => navigate(`/listing/${listing._id}`)}>
      <div className="img">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="ph ph-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ padding: 8, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--teal-700)' }}>
              {listing.title.split(' ').slice(0, 2).join(' ')}
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
      <div className="body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span className="price">{fmtPrice(listing.price)}</span>
          {listing.openOffers && (
            <span style={{
              fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--teal-700)',
              fontWeight: 700, letterSpacing: '0.05em',
            }}>OFFERS</span>
          )}
        </div>
        <p className="ttl">{listing.title}</p>
        {!condensed && (
          <div className="meta">
            <Pin style={{ width: 12, height: 12 }} />
            <span>{listing.pickup?.split(',')[0]}</span>
            <span style={{ margin: '0 4px' }}>·</span>
            <span>{fmtRelativeTime(listing.createdAt)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
