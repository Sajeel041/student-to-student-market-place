import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import { Cart, Trash, Pin, Verified, ArrowRight, X } from '../components/ui/Icon';
import { fmtPrice } from '../utils/format';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQty, cartSubtotal, cartTotal } = useCart();
  const serviceFee = cart.length > 0 ? 50 : 0;
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="page">
      <TopBar title="Your cart" onBack={() => navigate(-1)} right={<div style={{ width: 44 }} />} />

      <div className="view">
        {cart.length === 0 ? (
          <div className="cart-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="cart-empty-ico" style={{ fontSize: 48, marginBottom: 16 }}>
              <Cart style={{ width: 56, height: 56, color: 'var(--muted-2)' }} />
            </div>
            <h3>Your cart is empty</h3>
            <p>Tap "Add to cart" on any listing to reserve it for campus pickup.</p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/')}
              style={{ marginTop: 16, maxWidth: 280 }}
            >
              Browse listings
            </button>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {cart.map(item => (
                <div className="cart-row" key={item.listingId}>
                  <div className="cart-thumb" style={{ background: 'var(--teal-100)', overflow: 'hidden' }}>
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 20, color: 'var(--teal-700)' }}>📦</span>
                    )}
                  </div>
                  <div className="cart-info">
                    <div className="cart-title">{item.title}</div>
                    <div className="cart-meta">
                      <Pin style={{ width: 11, height: 11 }} /> {item.pickup}
                    </div>
                    <div className="cart-meta seller">
                      Sold by <strong>{item.sellerName}</strong>
                      <Verified style={{ width: 11, height: 11, color: 'var(--teal-700)' }} />
                    </div>
                    <div className="cart-row-foot">
                      <div className="qty">
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.listingId, Math.max(1, item.qty - 1))}
                          disabled={item.qty <= 1}
                          aria-label="Decrease"
                        >−</button>
                        <span>{item.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.listingId, item.qty + 1)}
                          aria-label="Increase"
                        >+</button>
                      </div>
                      <div className="cart-price">{fmtPrice(item.price * item.qty)}</div>
                    </div>
                  </div>
                  <button className="cart-x" onClick={() => removeFromCart(item.listingId)} aria-label="Remove">
                    <Trash style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="sum-row">
                <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span>{fmtPrice(cartSubtotal)}</span>
              </div>
              <div className="sum-row">
                <span>Service fee</span>
                <span>{fmtPrice(serviceFee)}</span>
              </div>
              <div className="sum-row">
                <span>Campus pickup</span>
                <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>FREE</span>
              </div>
              <div className="sum-row total">
                <span>Total</span>
                <span>{fmtPrice(cartTotal)}</span>
              </div>
            </div>

            <div className="cart-cta" style={{ padding: '0 20px 24px' }}>
              <button
                className="btn btn-primary btn-block"
                onClick={() => navigate('/checkout')}
                style={{ height: 54 }}
              >
                Checkout · {fmtPrice(cartTotal)} <ArrowRight width={16} height={16} />
              </button>
              <p className="cart-mini" style={{ marginTop: 10 }}>
                <Verified style={{ width: 14, height: 14 }} />
                {' '}Money is held until you confirm pickup.
              </p>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
