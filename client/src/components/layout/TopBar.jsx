import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cart } from '../ui/Icon';
import { useCart } from '../../contexts/CartContext';

export default function TopBar({ onBack, title, right, withBorder, transparent }) {
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const handleBack = onBack || (() => navigate(-1));

  return (
    <div
      className={`topbar ${withBorder ? 'with-border' : ''}`}
      style={transparent ? { background: 'transparent' } : undefined}
    >
      {onBack !== undefined ? (
        onBack ? (
          <button className="back-btn" onClick={handleBack} aria-label="Back">
            <ArrowLeft />
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )
      ) : (
        <div className="brand">
          <span className="brand-dot">U</span>
          UniSwap
        </div>
      )}

      {title && (
        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>
          {title}
        </div>
      )}

      {right !== undefined ? right : (
        <button
          className="back-btn"
          onClick={() => navigate('/cart')}
          aria-label="Cart"
          style={{ position: 'relative' }}
        >
          <Cart />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              background: 'var(--teal-700)', color: 'white',
              borderRadius: 999, fontSize: 9, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              minWidth: 16, height: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}>
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
