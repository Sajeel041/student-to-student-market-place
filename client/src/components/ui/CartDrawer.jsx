import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { X, Cart, Trash, ArrowRight } from './Icon';
import { fmtPrice } from '../../utils/format';

export default function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQty, cartSubtotal, cartTotal } = useCart();
  const serviceFee = cart.length > 0 ? 50 : 0;
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const goToCart = () => { onClose(); navigate('/cart'); };
  const goToCheckout = () => { onClose(); navigate('/checkout'); };

  return (
    <div className={`cart-drawer-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className={`cart-drawer ${open ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div className="cart-drawer-title">
            <Cart style={{ width: 22, height: 22 }} />
            Cart
            {itemCount > 0 && <span className="cart-drawer-count">{itemCount}</span>}
          </div>
          <button className="cart-drawer-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>

        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="cart-drawer-empty">
              <Cart />
              <h4>Your cart is empty</h4>
              <p>Tap "Add to cart" on any listing to reserve it.</p>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-drawer-item" key={item.listingId}>
                <div className="cart-drawer-item-img">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.title} />
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 26 }}>📦</span>
                  )}
                </div>
                <div className="cart-drawer-item-info">
                  <div className="cart-drawer-item-title">{item.title}</div>
                  <div className="cart-drawer-item-seller">by {item.sellerName}</div>
                  <div className="cart-drawer-item-bottom">
                    <div className="cart-drawer-qty">
                      <button
                        onClick={() => updateQty(item.listingId, Math.max(1, item.qty - 1))}
                        disabled={item.qty <= 1}
                      >−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.listingId, item.qty + 1)}>+</button>
                    </div>
                    <span className="cart-drawer-item-price">{fmtPrice(item.price * item.qty)}</span>
                  </div>
                </div>
                <button
                  className="cart-drawer-item-rm"
                  onClick={() => removeFromCart(item.listingId)}
                  aria-label="Remove"
                >
                  <Trash />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-summary">
              <div className="cart-drawer-sum-row">
                <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span>{fmtPrice(cartSubtotal)}</span>
              </div>
              <div className="cart-drawer-sum-row">
                <span>Service fee</span>
                <span>{fmtPrice(serviceFee)}</span>
              </div>
              <div className="cart-drawer-sum-row total">
                <span>Total</span>
                <span>{fmtPrice(cartTotal)}</span>
              </div>
            </div>
            <div className="cart-drawer-btns">
              <button className="cart-drawer-btn-outline" onClick={goToCart}>
                Go to Cart
              </button>
              <button className="cart-drawer-btn-checkout" onClick={goToCheckout}>
                Checkout <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
