import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useAcceptedOffersForCart } from '../hooks/useAcceptedOffersForCart';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft, ArrowRight, CheckCirc, Lock, Pin, Verified, Warning, CardIcon, PhoneIcon, Clock,
} from '../components/ui/Icon';
import { fmtPrice, fmtDateTime } from '../utils/format';
import { PICKUP_SLOTS, isSlotPast, PICKUP_LOCATIONS } from '../utils/constants';

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
/** National mobile after +92: 10 digits, first digit 3 (no leading 0). */
const fmtWallet = (v) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('92')) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return d.slice(0, 10);
};

const isoLocal = (date) => {
  const off = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
};

// Returns the earliest selectable datetime-local string (now + 30 min, rounded
// up to the next quarter-hour) so users propose times they can realistically
// honour.
const minProposableLocal = () => {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m + (15 - (m % 15 || 15)));
  return isoLocal(d);
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { offerMap, effectiveTotal: effectiveCartTotal, discountAmount } = useAcceptedOffersForCart(cart);
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
  const [clockTick, setClockTick] = useState(0);

  // ── Custom pickup-time negotiation ───────────────────────────────
  // Buyer can either pick a preset slot (above) OR propose a custom time
  // which goes to the seller via the chat / notifications. We poll for
  // status while the buyer waits.
  const [pickupMode, setPickupMode] = useState('preset'); // 'preset' | 'custom'
  const [customTime, setCustomTime] = useState('');
  const [customLocation, setCustomLocation] = useState(PICKUP_LOCATIONS[0] || '');
  const [customNote, setCustomNote] = useState('');
  const [customErr, setCustomErr] = useState(null);
  const [counterTime, setCounterTime] = useState('');
  const [counterLocation, setCounterLocation] = useState(PICKUP_LOCATIONS[0] || '');
  const [pickupRequest, setPickupRequest] = useState(null);
  const [pickupBusy, setPickupBusy] = useState(false);

  // Only single-listing carts are supported in our negotiation flow because
  // pickup requests are scoped to a single listing/seller pair.
  const firstItem = cart[0];
  const listingForCustom = firstItem?.listingId;

  if (cart.length === 0 && !placedOrderId) {
    navigate('/cart', { replace: true });
    return null;
  }

  // Re-evaluate "is this slot past" once a minute so a user who lingers on
  // the page doesn't end up picking a slot that just expired.
  useEffect(() => {
    const t = setInterval(() => setClockTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // If the currently-selected slot has lapsed while sitting on the page,
  // clear the selection so the user has to pick again.
  useEffect(() => {
    if (!pickupSlot) return;
    const s = PICKUP_SLOTS.find(x => x.id === pickupSlot);
    if (s && isSlotPast(s)) {
      setPickupSlot('');
      setPickupErr('That time slot just lapsed. Please pick another.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockTick]);

  // Load any existing pickup-request for this listing on mount so the buyer
  // can resume mid-negotiation. We don't switch them into custom mode by
  // default — preset slots are still the fastest path.
  useEffect(() => {
    if (!listingForCustom) return;
    let alive = true;
    api.get(`/pickup-requests/listing/${listingForCustom}/mine`)
      .then((r) => { if (alive && r.data) setPickupRequest(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [listingForCustom]);

  // Poll while a pickup request is waiting on the seller, so the buyer sees
  // accept/counter outcomes without refreshing.
  useEffect(() => {
    if (!listingForCustom) return;
    if (!pickupRequest) return;
    if (pickupRequest.status === 'accepted' || pickupRequest.status === 'declined') return;
    const t = setInterval(() => {
      api.get(`/pickup-requests/listing/${listingForCustom}/mine`)
        .then((r) => setPickupRequest(r.data))
        .catch(() => {});
    }, 6000);
    return () => clearInterval(t);
  }, [listingForCustom, pickupRequest?.status, pickupRequest?._id]);

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
    wallet: v => {
      if (!v) return 'Enter your mobile number.';
      if (v.length !== 10) return `Enter 10 digits after +92 (${v.length}/10).`;
      if (!/^3\d{9}$/.test(v)) return 'Use 10 digits starting with 3 (no 0 after +92).';
      return null;
    },
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

  // For preset slots we anchor the pickupAt to the end of the slot window so
  // reminders fire on schedule.
  const slotToDate = (slot) => {
    if (!slot) return null;
    const d = new Date();
    d.setHours(slot.endH, slot.endM ?? 0, 0, 0);
    if (slot.day === 'tomorrow') d.setDate(d.getDate() + 1);
    return d;
  };

  const lockedTime = pickupRequest?.status === 'accepted' ? new Date(pickupRequest.acceptedTime) : null;
  const lockedLocation = pickupRequest?.status === 'accepted' ? pickupRequest.acceptedLocation : '';

  const goToPayment = () => {
    if (pickupMode === 'custom') {
      if (!pickupRequest || pickupRequest.status !== 'accepted') {
        setCustomErr('Wait until the seller has accepted your time before paying.');
        return;
      }
      setCustomErr(null);
      setStep(2);
      return;
    }
    if (!pickupSlot) { setPickupErr('Pick a time slot so the seller knows when to meet you.'); return; }
    const chosen = PICKUP_SLOTS.find(s => s.id === pickupSlot);
    if (chosen && isSlotPast(chosen)) {
      setPickupSlot('');
      setPickupErr('That slot has already passed. Please pick another.');
      return;
    }
    setPickupErr(null);
    setStep(2);
  };

  const sendCustomProposal = async () => {
    if (!listingForCustom) { setCustomErr('Your cart is empty.'); return; }
    if (!customTime) { setCustomErr('Pick a date and time.'); return; }
    const when = new Date(customTime);
    if (Number.isNaN(when.getTime())) { setCustomErr('That date is invalid.'); return; }
    if (when.getTime() < Date.now() + 15 * 60_000) {
      setCustomErr('Pick a time at least 15 minutes from now.'); return;
    }
    setCustomErr(null);
    setPickupBusy(true);
    try {
      const r = await api.post('/pickup-requests', {
        listingId: listingForCustom,
        time: when.toISOString(),
        location: customLocation,
        note: customNote,
      });
      setPickupRequest(r.data);
    } catch (err) {
      setCustomErr(err.response?.data?.message || 'Could not send proposal.');
    } finally {
      setPickupBusy(false);
    }
  };

  const acceptCounter = async () => {
    if (!pickupRequest?._id) return;
    setPickupBusy(true);
    try {
      const r = await api.patch(`/pickup-requests/${pickupRequest._id}/accept`, {});
      setPickupRequest(r.data);
    } catch (err) {
      setCustomErr(err.response?.data?.message || 'Could not accept.');
    } finally {
      setPickupBusy(false);
    }
  };

  const sendCounter = async () => {
    if (!pickupRequest?._id) return;
    if (!counterTime) { setCustomErr('Pick a date and time to counter.'); return; }
    const when = new Date(counterTime);
    if (Number.isNaN(when.getTime())) { setCustomErr('Invalid date.'); return; }
    if (when.getTime() < Date.now() + 15 * 60_000) {
      setCustomErr('Pick a time at least 15 minutes from now.'); return;
    }
    setCustomErr(null);
    setPickupBusy(true);
    try {
      const r = await api.patch(`/pickup-requests/${pickupRequest._id}/counter`, {
        time: when.toISOString(),
        location: counterLocation,
      });
      setPickupRequest(r.data);
      setCounterTime('');
    } catch (err) {
      setCustomErr(err.response?.data?.message || 'Could not counter.');
    } finally {
      setPickupBusy(false);
    }
  };

  const submitPayment = async () => {
    let allErrs = {};
    if (method === 'card') {
      allErrs = { cardName: validators.cardName(cardName), cardNum: validators.cardNum(cardNum), exp: validators.exp(exp), cvv: validators.cvv(cvv) };
      setTouched({ cardName: true, cardNum: true, exp: true, cvv: true });
    } else if (method === 'jazzcash' || method === 'easypaisa') {
      allErrs = { wallet: validators.wallet(wallet) };
      setTouched({ wallet: true });
    } else if (method === 'cod') {
      allErrs = {}; // nothing to validate up-front
      setTouched({});
    }
    setErrors(allErrs);
    if (Object.values(allErrs).some(Boolean)) return;

    const slot = PICKUP_SLOTS.find(s => s.id === pickupSlot);
    setSubmitting(true);
    setPaymentError(null);

    const pickupSlotLabel = pickupMode === 'custom'
      ? `Agreed time · ${lockedTime ? fmtDateTime(lockedTime) : 'TBD'}`
      : (slot?.label || pickupSlot);
    const pickupLocationFinal = pickupMode === 'custom'
      ? (lockedLocation || cart[0]?.pickup || 'GIKI Campus')
      : (slot?.sub || cart[0]?.pickup || 'GIKI Campus');
    const pickupAtIso = pickupMode === 'custom'
      ? (lockedTime ? lockedTime.toISOString() : null)
      : (slotToDate(slot)?.toISOString() || null);

    try {
      const payload = {
        items: cart.map(item => ({
          listing: item.listingId,
          title: item.title,
          price: offerMap[String(item.listingId)]?.amount ?? item.price,
          qty: 1,
          sellerName: item.sellerName,
          pickupLocation: item.pickup,
        })),
        total: effectiveCartTotal,
        paymentMethod: method,
        pickupSlot: pickupSlotLabel,
        pickupLocation: pickupLocationFinal,
        pickupAt: pickupAtIso,
        pickupRequestId: pickupMode === 'custom' ? pickupRequest?._id : null,
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
    const successSlot = pickupMode === 'custom' && lockedTime
      ? { label: `Agreed time · ${fmtDateTime(lockedTime)}`, sub: lockedLocation || cart[0]?.pickup || 'GIKI Campus' }
      : slot;
    return <SuccessScreen orderId={placedOrderId} slot={successSlot} method={method} cardNum={cardNum} wallet={wallet} total={effectiveCartTotal} navigate={navigate} />;
  }

  return (
    <div className="page checkout-page-shell">
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
            <h3 className="sec-title">Choose a pickup time</h3>
            <p className="sec-sub">Pick a preset slot or propose a custom time and chat it through with the seller.</p>

            <div className="pickup-mode-toggle" role="tablist" aria-label="Pickup mode">
              <button
                type="button"
                role="tab"
                aria-selected={pickupMode === 'preset'}
                className={`pickup-mode-btn ${pickupMode === 'preset' ? 'active' : ''}`}
                onClick={() => { setPickupMode('preset'); setCustomErr(null); }}
              >
                Preset slot
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pickupMode === 'custom'}
                className={`pickup-mode-btn ${pickupMode === 'custom' ? 'active' : ''}`}
                onClick={() => { setPickupMode('custom'); setPickupErr(null); }}
              >
                Custom · negotiate with seller
              </button>
            </div>

            {pickupMode === 'preset' && (
              <>
                <div className="slot-list">
                  {PICKUP_SLOTS.map(s => {
                    const past = isSlotPast(s);
                    const selected = pickupSlot === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={past}
                        aria-disabled={past}
                        className={`slot ${selected ? 'active' : ''} ${past ? 'past' : ''}`}
                        onClick={() => {
                          if (past) return;
                          setPickupSlot(s.id);
                          setPickupErr(null);
                        }}
                        title={past ? 'This slot has already passed.' : undefined}
                      >
                        <div className="slot-radio">{selected && <span />}</div>
                        <div style={{ flex: 1 }}>
                          <div className="slot-label">{s.label}</div>
                          <div className="slot-sub"><Pin style={{ width: 11, height: 11 }} /> {s.sub}</div>
                        </div>
                        {past
                          ? <span className="slot-tag">Time passed</span>
                          : selected && <CheckCirc style={{ width: 20, height: 20, color: 'var(--teal-700)' }} />
                        }
                      </button>
                    );
                  })}
                </div>
                {pickupErr && <div className="err" style={{ marginTop: 10 }}><Warning /> {pickupErr}</div>}
              </>
            )}

            {pickupMode === 'custom' && (
              <div className="custom-pickup-block">
                {!pickupRequest && (
                  <>
                    <div className="field">
                      <label>Proposed date & time <span className="req">*</span></label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={customTime}
                        min={minProposableLocal()}
                        onChange={(e) => { setCustomTime(e.target.value); setCustomErr(null); }}
                      />
                    </div>
                    <div className="field">
                      <label>Pickup location</label>
                      <select
                        className="input"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                      >
                        {PICKUP_LOCATIONS.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Note to seller (optional)</label>
                      <textarea
                        className="input"
                        rows={2}
                        value={customNote}
                        maxLength={240}
                        placeholder="Any quick context — e.g. 'after my 4pm lab.'"
                        onChange={(e) => setCustomNote(e.target.value)}
                      />
                    </div>
                    {customErr && <div className="err" style={{ marginTop: 6 }}><Warning /> {customErr}</div>}
                    <button
                      type="button"
                      className="btn btn-secondary btn-block"
                      disabled={pickupBusy || !customTime}
                      onClick={sendCustomProposal}
                      style={{ marginTop: 10, height: 48 }}
                    >
                      {pickupBusy ? <Spinner size={16} /> : 'Send request to seller'}
                    </button>
                    <p className="field-hint" style={{ marginTop: 8 }}>
                      We'll notify the seller. You'll see their accept / counter here.
                    </p>
                  </>
                )}

                {pickupRequest && (
                  <PickupNegotiationCard
                    pr={pickupRequest}
                    onAccept={acceptCounter}
                    onCounter={sendCounter}
                    counterTime={counterTime}
                    setCounterTime={setCounterTime}
                    counterLocation={counterLocation}
                    setCounterLocation={setCounterLocation}
                    busy={pickupBusy}
                    minLocal={minProposableLocal()}
                    err={customErr}
                  />
                )}
              </div>
            )}
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
                <div className="recap-price">
                  {offerMap[String(item.listingId)]
                    ? fmtPrice(offerMap[String(item.listingId)].amount * item.qty)
                    : fmtPrice(item.price * item.qty)
                  }
                </div>
              </div>
            ))}
            {discountAmount > 0 && (
              <div className="sum-row" style={{ marginTop: 6 }}>
                <span>Offer discount</span><span style={{ color: 'var(--green)', fontWeight: 800 }}>−{fmtPrice(discountAmount)}</span>
              </div>
            )}
            <div className="sum-row total" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span>Total</span><span>{fmtPrice(effectiveCartTotal)}</span>
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
            <div className="pay-methods-scroll">
              <div className="pay-methods">
                {[
                  { id: 'card', label: 'Card', sub: 'Visa, Mastercard', ico: <CardIcon /> },
                  { id: 'jazzcash', label: 'JazzCash', sub: 'Mobile wallet', ico: <PhoneIcon /> },
                  { id: 'easypaisa', label: 'EasyPaisa', sub: 'Mobile wallet', ico: <PhoneIcon /> },
                  { id: 'cod', label: 'Cash on delivery', sub: 'Pay seller at pickup', ico: <Pin /> },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`pay-method ${method === m.id ? 'active' : ''}`}
                    onClick={() => { setMethod(m.id); setErrors({}); setTouched({}); setPaymentError(null); }}
                  >
                    <div className="pm-ico">{m.ico}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pm-label">{m.label}</div>
                      <div className="pm-sub">{m.sub}</div>
                    </div>
                    <div className="pm-radio">{method === m.id && <span />}</div>
                  </button>
                ))}
              </div>
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
                <input className={`input ${touched.cardNum && errors.cardNum ? 'error' : ''}`} placeholder="4242 4242 4242 4242" value={cardNum} inputMode="numeric" autoComplete="cc-number" onChange={e => change('cardNum', fmtCard(e.target.value), setCardNum)} onBlur={() => blur('cardNum', cardNum)} style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }} />
                {touched.cardNum && errors.cardNum
                  ? <div className="err"><Warning /> {errors.cardNum}</div>
                  : <div className="field-hint">Demo only — use any valid card or the test card <code>4242 4242 4242 4242</code>.</div>
                }
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
                  <input className={`input ${touched.wallet && errors.wallet ? 'error' : ''}`} placeholder="3001234567" value={wallet} inputMode="numeric" autoComplete="tel-national" onChange={e => change('wallet', fmtWallet(e.target.value), setWallet)} onBlur={() => blur('wallet', wallet)} style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                <div className="field-hint">10 digits after +92, starting with 3 (not 03).</div>
                {touched.wallet && errors.wallet && <div className="err"><Warning /> {errors.wallet}</div>}
              </div>
            </div>
          )}

          {method === 'cod' && (
            <div className="form-section">
              <h3 className="sec-title">Cash on delivery</h3>
              <div className="cod-info">
                <div className="cod-info-row">
                  <Pin style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span>
                    Bring exact change. Pay the seller <strong>{fmtPrice(effectiveCartTotal)}</strong> when you meet on campus.
                  </span>
                </div>
                <div className="cod-info-row">
                  <Verified style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span>
                    The listing is reserved for you the moment you place the order — no one else can buy it while pickup is pending.
                  </span>
                </div>
                <div className="cod-info-row">
                  <Clock style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span>
                    We'll remind you both after the pickup window. Confirm in 2 hours or the order closes automatically.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="order-recap">
            <h4>You're paying</h4>
            <div className="sum-row"><span>Subtotal</span><span>{fmtPrice(effectiveCartTotal - 50)}</span></div>
            <div className="sum-row"><span>Service fee</span><span>{fmtPrice(50)}</span></div>
            {discountAmount > 0 && (
              <div className="sum-row"><span>Offer discount</span><span style={{ color: 'var(--green)', fontWeight: 800 }}>−{fmtPrice(discountAmount)}</span></div>
            )}
            <div className="sum-row total"><span>Total</span><span>{fmtPrice(effectiveCartTotal)}</span></div>
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
            {submitting
              ? <><Spinner size={18} color="white" /> Processing…</>
              : method === 'cod'
                ? <>Confirm order · pay {fmtPrice(effectiveCartTotal)} at pickup</>
                : <>Pay {fmtPrice(effectiveCartTotal)} <Lock /></>
            }
          </button>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ orderId, slot, method, cardNum, wallet, total, navigate }) {
  const methodLabel = method === 'card'
    ? `Card · ••${cardNum.replace(/\s/g, '').slice(-4)}`
    : method === 'jazzcash' ? 'JazzCash'
    : method === 'easypaisa' ? 'EasyPaisa'
    : 'Cash on delivery';

  return (
    <div className="page checkout-page-shell checkout-success">
      <div className="success-mark"><CheckCirc /></div>
      <h1>Order placed!</h1>
      <p className="success-sub">
        {method === 'cod'
          ? 'The seller has been notified. Pay them in cash at pickup — the listing is reserved for you.'
          : 'Your seller has been notified. Money is held safely until you confirm pickup.'}
      </p>

      <div className="receipt">
        <div className="receipt-row"><span>Order ID</span><span style={{ fontFamily: 'var(--font-mono)' }}>{orderId?.slice(-8)?.toUpperCase()}</span></div>
        <div className="receipt-row"><span>Pickup</span><span style={{ textAlign: 'right' }}>{slot?.label}<br /><small style={{ color: 'var(--muted)' }}>{slot?.sub}</small></span></div>
        <div className="receipt-row"><span>{method === 'cod' ? 'Payment' : 'Paid via'}</span>
          <span>{methodLabel}</span>
        </div>
        <div className="receipt-row total"><span>{method === 'cod' ? 'Pay at pickup' : 'Total paid'}</span><span>{fmtPrice(total)}</span></div>
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

function PickupNegotiationCard({
  pr,
  onAccept, onCounter,
  counterTime, setCounterTime,
  counterLocation, setCounterLocation,
  busy, minLocal, err,
}) {
  const last = pr.proposals?.[pr.proposals.length - 1];
  const accepted = pr.status === 'accepted';
  const waitingOnSeller = pr.status === 'pending' && pr.awaitingFrom === 'seller';
  const waitingOnBuyer = pr.status === 'pending' && pr.awaitingFrom === 'buyer';

  return (
    <div className="negotiation-card">
      <div className="negotiation-status">
        {accepted && <><CheckCirc style={{ width: 18, height: 18, color: 'var(--teal-700)' }} /> Time locked</>}
        {!accepted && waitingOnSeller && <><Clock style={{ width: 16, height: 16 }} /> Waiting for seller</>}
        {!accepted && waitingOnBuyer && <><Clock style={{ width: 16, height: 16 }} /> Your turn — accept or counter</>}
      </div>

      <div className="negotiation-history">
        {pr.proposals.map((p, i) => (
          <div key={i} className={`neg-row ${p.byRole}`}>
            <div className="neg-row-by">
              <strong>{p.byRole === 'buyer' ? 'You proposed' : 'Seller proposed'}</strong>
              <span className="neg-row-when">{fmtDateTime(p.at)}</span>
            </div>
            <div className="neg-row-time">{fmtDateTime(p.time)}</div>
            {p.location && <div className="neg-row-loc"><Pin style={{ width: 11, height: 11 }} /> {p.location}</div>}
            {p.note && <div className="neg-row-note">"{p.note}"</div>}
          </div>
        ))}
      </div>

      {accepted && (
        <div className="negotiation-locked">
          <CheckCirc style={{ width: 18, height: 18, color: 'var(--teal-700)' }} />
          <div>
            <div style={{ fontWeight: 700 }}>{fmtDateTime(pr.acceptedTime)}</div>
            {pr.acceptedLocation && <div className="negotiation-locked-sub"><Pin style={{ width: 11, height: 11 }} /> {pr.acceptedLocation}</div>}
          </div>
        </div>
      )}

      {waitingOnBuyer && (
        <>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, height: 46 }}
              disabled={busy}
              onClick={onAccept}
            >
              Accept {fmtDateTime(last?.time)}
            </button>
          </div>
          <div className="negotiation-counter">
            <div className="field" style={{ marginTop: 14 }}>
              <label>Counter with a different time</label>
              <input
                type="datetime-local"
                className="input"
                min={minLocal}
                value={counterTime}
                onChange={(e) => setCounterTime(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Location</label>
              <select
                className="input"
                value={counterLocation}
                onChange={(e) => setCounterLocation(e.target.value)}
              >
                {PICKUP_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            {err && <div className="err" style={{ marginTop: 6 }}><Warning /> {err}</div>}
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ height: 46 }}
              disabled={busy || !counterTime}
              onClick={onCounter}
            >
              Send counter
            </button>
          </div>
        </>
      )}

      {waitingOnSeller && (
        <div className="negotiation-hint">
          We've sent the request. Keep this page open — when the seller responds, you'll see it here. You can also continue the chat in <a href={`/listing/${pr.listing?._id || pr.listing}`}>the listing</a>.
        </div>
      )}
    </div>
  );
}
