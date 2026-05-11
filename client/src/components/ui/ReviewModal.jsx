import { useEffect, useState } from 'react';
import api from '../../lib/api';
import Spinner from './Spinner';
import { Star, X, Warning } from './Icon';

const RATING_LABELS = {
  1: 'Bad',
  2: 'Poor',
  3: 'OK',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Modal that lets a buyer leave a single review for one picked-up order.
 *
 * Required props:
 *   open       — boolean
 *   onClose    — () => void
 *   order      — the order document (with at least { _id, items, ... } where
 *                items[0].listing is populated and exposes .seller).
 *   onSubmitted — (review) => void   (parent updates its review map)
 */
export default function ReviewModal({ open, onClose, order, onSubmitted }) {
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);

  useEffect(() => {
    if (!open) return;
    setStars(5);
    setHover(0);
    setText('');
    setErr(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !order) return null;

  const firstItem  = order.items?.[0] || {};
  const listing    = firstItem.listing || {};
  const seller     = listing.seller || {};
  const sellerName = seller.name || firstItem.sellerName || 'the seller';
  const listingId  = typeof listing === 'object' ? listing._id : listing;

  const canSubmit = stars >= 1 && stars <= 5 && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!listingId || !seller._id) {
      setErr('This order is missing seller info — please refresh and try again.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post('/reviews', {
        revieweeId: seller._id,
        listingId,
        orderId: order._id,
        stars,
        text: text.trim(),
      });
      onSubmitted?.(r.data);
      onClose();
    } catch (e2) {
      setErr(
        e2?.response?.data?.message ||
        e2?.message ||
        'Could not submit your review.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="sheet-overlay"
        aria-label="Close review form"
        onClick={onClose}
        style={{ border: 0, padding: 0, cursor: 'pointer' }}
      />
      <div className="sheet review-sheet" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="sheet-handle" />

        <div className="sheet-hd">
          <h3 id="review-title">Rate {sellerName}</h3>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        <form className="sheet-body review-form" onSubmit={submit}>
          <p className="review-sub">
            How was your pickup of <strong>{firstItem.title || 'this item'}</strong>?
            Your review is public and helps other buyers.
          </p>

          <div
            className="review-stars"
            onMouseLeave={() => setHover(0)}
            role="radiogroup"
            aria-label="Star rating"
          >
            {[1, 2, 3, 4, 5].map(n => {
              const filled = (hover || stars) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`review-star ${filled ? 'on' : ''}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setStars(n)}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  aria-checked={stars === n}
                  role="radio"
                >
                  <Star />
                </button>
              );
            })}
          </div>
          <div className="review-stars-label">
            {RATING_LABELS[hover || stars]} <span>· {hover || stars}/5</span>
          </div>

          <div className="field">
            <label htmlFor="review-text">Your review <span className="field-hint" style={{ fontWeight: 400 }}>(optional)</span></label>
            <textarea
              id="review-text"
              className="textarea"
              placeholder={`Was ${sellerName} on time? Was the item as described?`}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={5}
            />
            <div className="field-hint" style={{ textAlign: 'right' }}>{text.length}/500</div>
          </div>

          {err && (
            <div className="edit-profile-submit-err">
              <Warning /> {err}
            </div>
          )}

          <div className="sheet-footer edit-profile-footer">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-full" disabled={!canSubmit}>
              {busy ? <Spinner size={16} /> : 'Post review'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
