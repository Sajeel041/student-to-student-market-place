import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft, ArrowRight, CheckCirc, Lock, Pin, Verified, Warning, CardIcon, PhoneIcon,
} from '../components/ui/Icon';
import { fmtPrice } from '../utils/format';
import { PICKUP_SLOTS } from '../utils/constants';

const luhn = (num) => {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  if (digits.length < 13) return false;
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) { const x = d * 2; return acc + (x > 9 ? x - 9 : x); }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
};

const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length <= 2 ? d : d.slice(0, 2) + '/' + d.slice(2); };
const fmtWallet = (v) => v.replace(/\D/g, '').slice(0, 11);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [pickupSlot, setPickupSlot] = useState('');
  const [pickupErr, setPickupErr] = useState(null);
  const [method, setMethod] = useState('card');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [wallet, setWallet] = useState('');
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [paymentError, setPaymentError] = useState(null);
  const [placedOrderId, setPlacedOrderId] = useState(null);

  if (cart.length === 0 && !placedOrderId) {
    navigate('/cart', { replace: true });
    return null;
  }

  const cardBrand = useMemo(() => {
    const n = cardNum.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    return null;
  }, [cardNum]);

  const validators = {
    cardName: v => { const t = (v || '').trim(); if (!t) return 'Enter the name on your card.'; if (t.length < 2) return 'Name is too short.'; return null; },
    cardNum: v => { const n = (v || '').replace(/\s/g, ''); if (!n) return 'Enter the 16-digit number.'; if (n.length < 13) return `Too short — ${n.length} digits.`; if (!luhn(n)) return 'Invalid card number.'; return null; },
    exp: v => { if (!v) return 'Enter expiry as MM/YY.'; const m = v.match(/^(\d{2})\/(\d{2})$/); if (!m) return 'Use MM/YY format.'; const mm = parseInt(m[1]); if (mm < 1 || mm > 12) return 'Invalid month.'; return null; },
    cvv: v => { if (!v) return 'Enter the CVV.'; const need = cardBrand === 'Amex' ? 4 : 3; if (v.length !== need) return `CVV should be ${need} digits.`; return null; },
    wallet: v => { if (!v) return 'Enter your mobile number.'; if (v.length !== 11) return `Need 11 digits, got ${v.length}.`; if (!/^03/.test(v)) return 'Must start with "03".'; return null; },
  };

  const blur = (field, val) => {
    setTouched(t => ({ ...t, [field]: true }));
    setErrors(e => ({ ...e, [field]: validators[field]?.(val) }));
  };
  const change = (field, val, setter) => {
    setter(val);
    setPaymentError(null);
    if (touched[field]) setErrors(e => ({ ...e, [field]: validators[field]?.(val) }));
  };

  const goToPayment = () => {
    if (!pickupSlot) { setPickupErr('Pick a time slot so the seller knows when to meet you.'); return; }
    setPickupErr(null);
    setStep(2);
  };

  const submitPayment = async () => {
    let allErrs = {};
    if (method === 'card') {
      allErrs = { cardName: validators.cardName(cardName), cardNum: validators.cardNum(cardNum), exp: validators.exp(exp), cvv: validators.cvv(cvv) };
      setTouched({ cardName: true, cardNum: true, exp: true, cvv: true });
    } else {
      allErrs = { wallet: validators.wallet(wallet) };
      setTouched({ wallet: true });
    }
    setErrors(allErrs);
    if (Object.values(allErrs).some(Boolean)) return;

    const slot = PICKUP_SLOTS.find(s => s.id === pickupSlot);
    setSubmitting(true);
    setPaymentError(null);

    try {
      const payload = {
        items: cart.map(item => ({
          listing: item.listingId,
          title: item.title,
          price: item.price,
          qty: item.qty,
          sellerName: item.sellerName,
          pickupLocation: item.pickup,
        })),
        total: cartTotal,
        paymentMethod: method,
        pickupSlot: slot?.label || pickupSlot,
        pickupLocation: slot?.sub || cart[0]?.pickup || 'GIKI Campus',
      };
      const r = await api.post('/orders', payload);
      clearCart();
      setPlacedOrderId(r.data._id);
      setStep(3);
    } catch (err) {
      setPaymentError({
        title: 'Order failed.',
        body: err.response?.data?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const slot = PICKUP_SLOTS.find(s => s.id === pickupSlot);

  if (step === 3 && placedOrderId) {
    return <SuccessScreen orderId={placedOrderId} slot={slot} method={method} cardNum={cardNum} wallet={wallet} total={cartTotal} navigate={navigate} />;
  }

  return (
    <>
      <div className="topbar with-border">
        <button className="back-btn" onClick={() => step === 1 ? navigate('/cart') : setStep(1)} aria-label="Back">
          <ArrowLeft />
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{step === 1 ? 'Pickup details' : 'Payment'}</div>
        <div style={{ width: 44 }} />
      </div>

      <div className="checkout-progress">
        {['Pickup', 'Pay', 'Done'].map((label, idx) => (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`cp-step ${step > idx ? 'done' : ''} ${step === idx + 1 ? 'active' : ''}`}>
              <span className="cp-dot">{idx + 1}</span> {label}
            </div>
            {idx < 2 && <div className={`cp-line ${step > idx + 1 ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="checkout-body">
          <div className="form-section">
            <h3 className="sec-title">Choose a pickup slot</h3>
            <p className="sec-sub">All pickups happen on campus. The seller meets you at the time you pick.</p>
            <div className="slot-list">
              {PICKUP_SLOTS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`slot ${pickupSlot === s.id ? 'active' : ''}`}
                  onClick={() => { setPickupSlot(s.id); setPickupErr(null); }}
                >
                  <div className="slot-radio">{pickupSlot === s.id && <span />}</div>
                  <div style={{ flex: 1 }}>
                    <div className="slot-label">{s.label}</div>
                    <div className="slot-sub"><Pin style={{ width: 11, height: 11 }} /> {s.sub}</div>
                  </div>
                  {pickupSlot === s.id && <CheckCirc style={{ width: 20, height: 20, color: 'var(--teal-700)' }} />}
                </button>
              ))}
            </div>
            {pickupErr && <div className="err" style={{ marginTop: 10 }}><Warning /> {pickupErr}</div>}
          </div>

          <div className="order-recap">
            <h4>Order summary</h4>
            {cart.map(item => (
              <div className="recap-row" key={item.listingId}>
                <div className="recap-thumb" style={{ background: 'var(--teal-100)', overflow: 'hidden', borderRadius: 8 }}>
                  {item.photoUrl
                    ? <img src={item.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span>📦</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="recap-title">{item.title}</div>
                  <div className="recap-meta">Qty {item.qty}</div>
                </div>
                <div className="recap-price">{fmtPrice(item.price * item.qty)}</div>
              </div>
            ))}
            <div className="sum-row total" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span>Total</span><span>{fmtPrice(cartTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="checkout-body">
          {paymentError && (
            <div className="payment-banner err">
              <div className="pb-ico"><Warning /></div>
              <div className="pb-text">
                <div className="pb-title">{paymentError.title}</div>
                <div className="pb-body">{paymentError.body}</div>
              </div>
            </div>
          )}

          <div className="form-section">
            <h3 className="sec-title">Payment method</h3>
            <div className="pay-methods">
              {[
                { id: 'card', label: 'Card', sub: 'Visa, Mastercard', ico: <CardIcon /> },
                { id: 'jazzcash', label: 'JazzCash', sub: 'Mobile wallet', ico: <PhoneIcon /> },
                { id: 'easypaisa', label: 'EasyPaisa', sub: 'Mobile wallet', ico: <PhoneIcon /> },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`pay-method ${method === m.id ? 'active' : ''}`}
                  onClick={() => { setMethod(m.id); setErrors({}); setTouched({}); setPaymentError(null); }}
                >
                  <div className="pm-ico">{m.ico}</div>
                  <div style={{ flex: 1 }}>
                    <div className="pm-label">{m.label}</div>
                    <div className="pm-sub">{m.sub}</div>
                  </div>
                  <div className="pm-radio">{method === m.id && <span />}</div>
                </button>
              ))}
            </div>
          </div>

          {method === 'card' && (
            <div className="form-section">
              <h3 className="sec-title">Card details</h3>
              <div className={`card-preview ${cardBrand ? 'brand-' + cardBrand.toLowerCase() : ''}`}>
                <div className="cp-chip" />
                <div className="cp-num">{cardNum || '•••• •••• •••• ••••'}</div>
                <div className="cp-row">
                  <div>
                    <div className="cp-lbl">Cardholder</div>
                    <div className="cp-val">{cardName.toUpperCase() || 'YOUR NAME'}</div>
                  </div>
                  <div>
                    <div className="cp-lbl">Expires</div>
                    <div className="cp-val">{exp || 'MM/YY'}</div>
                  </div>
                </div>
                {cardBrand && <div className="cp-brand">{cardBrand}</div>}
              </div>

              <div className="field">
                <label>Cardholder name <span className="req">*</span></label>
                <input className={`input ${touched.cardName && errors.cardName ? 'error' : ''}`} placeholder="Ayesha Malik" value={cardName} onChange={e => change('cardName', e.target.value, setCardName)} onBlur={() => blur('cardName', cardName)} autoComplete="cc-name" />
                {touched.cardName && errors.cardName && <div className="err"><Warning /> {errors.cardName}</div>}
              </div>

              <div className="field">
                <label>Card number <span className="req">*</span></label>
                <input className={`input ${touched.cardNum && errors.cardNum ? 'error' : ''}`} placeholder="1234 5678 9012 3456" value={cardNum} inputMode="numeric" autoComplete="cc-number" onChange={e => change('cardNum', fmtCard(e.target.value), setCardNum)} onBlur={() => blur('cardNum', cardNum)} style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }} />
                {touched.cardNum && errors.cardNum && <div className="err"><Warning /> {errors.cardNum}</div>}
              </div>

              <div className="form-grid">
                <div className="field">
                  <label>Expires <span className="req">*</span></label>
                  <input className={`input ${touched.exp && errors.exp ? 'error' : ''}`} placeholder="MM/YY" value={exp} inputMode="numeric" autoComplete="cc-exp" onChange={e => change('exp', fmtExp(e.target.value), setExp)} onBlur={() => blur('exp', exp)} style={{ fontFamily: 'var(--font-mono)' }} />
                  {touched.exp && errors.exp && <div className="err"><Warning /> {errors.exp}</div>}
                </div>
                <div className="field">
                  <label>CVV <span className="req">*</span></label>
                  <input className={`input ${touched.cvv && errors.cvv ? 'error' : ''}`} type="password" placeholder="•••" value={cvv} inputMode="numeric" autoComplete="cc-csc" onChange={e => change('cvv', e.target.value.replace(/\D/g, '').slice(0, 4), setCvv)} onBlur={() => blur('cvv', cvv)} style={{ fontFamily: 'var(--font-mono)' }} />
                  {touched.cvv && errors.cvv && <div className="err"><Warning /> {errors.cvv}</div>}
                </div>
              </div>

              <p className="login-mini"><Verified style={{ width: 14, height: 14, verticalAlign: -2 }} /> Encrypted end-to-end. UniSwap never stores your full card number.</p>
            </div>
          )}

          {(method === 'jazzcash' || method === 'easypaisa') && (
            <div className="form-section">
              <h3 className="sec-title">{method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} number</h3>
              <div className="field">
                <label>Mobile number <span className="req">*</span></label>
                <div className="input-wrap with-pre">
                  <span className="input-pre">+92</span>
                  <input className={`input ${touched.wallet && errors.wallet ? 'error' : ''}`} placeholder="03001234567" value={wallet} inputMode="numeric" onChange={e => change('wallet', fmtWallet(e.target.value), setWallet)} onBlur={() => blur('wallet', wallet)} style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                {touched.wallet && errors.wallet && <div className="err"><Warning /> {errors.wallet}</div>}
              </div>
            </div>
          )}

          <div className="order-recap">
            <h4>You're paying</h4>
            <div className="sum-row"><span>Subtotal</span><span>{fmtPrice(cartTotal - 50)}</span></div>
            <div className="sum-row"><span>Service fee</span><span>{fmtPrice(50)}</span></div>
            <div className="sum-row total"><span>Total</span><span>{fmtPrice(cartTotal)}</span></div>
          </div>
        </div>
      )}

      <div className="checkout-cta">
        {step === 1 && (
          <button className="btn btn-primary" onClick={goToPayment} style={{ height: 54 }}>
            Continue to payment <ArrowRight />
          </button>
        )}
        {step === 2 && (
          <button className="btn btn-primary" onClick={submitPayment} disabled={submitting} style={{ height: 54 }}>
            {submitting ? <><Spinner size={18} color="white" /> Processing…</> : <>Pay {fmtPrice(cartTotal)} <Lock /></>}
          </button>
        )}
      </div>
    </>
  );
}

function SuccessScreen({ orderId, slot, method, cardNum, wallet, total, navigate }) {
  return (
    <div className="checkout-success">
      <div className="success-mark"><CheckCirc /></div>
      <h1>Order placed!</h1>
      <p className="success-sub">Your seller has been notified. Money is held safely until you confirm pickup.</p>

      <div className="receipt">
        <div className="receipt-row"><span>Order ID</span><span style={{ fontFamily: 'var(--font-mono)' }}>{orderId?.slice(-8)?.toUpperCase()}</span></div>
        <div className="receipt-row"><span>Pickup</span><span style={{ textAlign: 'right' }}>{slot?.label}<br /><small style={{ color: 'var(--muted)' }}>{slot?.sub}</small></span></div>
        <div className="receipt-row"><span>Paid via</span>
          <span>
            {method === 'card' ? `Card · ••${cardNum.replace(/\s/g, '').slice(-4)}` : method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'}
          </span>
        </div>
        <div className="receipt-row total"><span>Total paid</span><span>{fmtPrice(total)}</span></div>
      </div>

      <div className="success-tips">
        <div className="tip"><span className="tip-num">1</span><div><strong>Bring your student ID.</strong> Sellers check before handing over.</div></div>
        <div className="tip"><span className="tip-num">2</span><div><strong>Tap "I picked it up"</strong> in your profile to release payment to the seller.</div></div>
        <div className="tip"><span className="tip-num">3</span><div><strong>Issue at pickup?</strong> Open a dispute within 24 hours.</div></div>
      </div>

      <div className="checkout-cta checkout-cta--success">
        <button className="btn btn-primary" onClick={() => navigate('/profile')} style={{ height: 54 }}>
          View in profile <ArrowRight />
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}
