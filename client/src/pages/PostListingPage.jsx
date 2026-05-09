import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import TopBar from '../components/layout/TopBar';
import ImageUpload from '../components/forms/ImageUpload';
import Spinner from '../components/ui/Spinner';
import { ArrowRight, Check, CheckCirc, Warning, Info, Sparkle, Pin } from '../components/ui/Icon';
import { fmtPrice } from '../utils/format';
import { CAT_TILES, CONDITIONS, PICKUP_LOCATIONS } from '../utils/constants';

export default function PostListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [form, setForm] = useState({
    photos: [],
    title: '',
    category: '',
    courseCode: '',
    condition: '',
    price: '',
    description: '',
    pickup: '',
    moveOut: false,
    openOffers: true,
  });
  const [touched, setTouched] = useState({});
  const [submitTried, setSubmitTried] = useState({ 1: false, 2: false, 3: false });

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const blur = (k) => setTouched(t => ({ ...t, [k]: true }));

  const errors = useMemo(() => {
    const e = {};
    if (form.photos.length === 0) e.photos = 'Add at least 1 photo so buyers can see your item.';
    if (!form.title.trim()) e.title = 'Add a clear title — what is it?';
    else if (form.title.trim().length < 6) e.title = 'Make the title at least 6 characters.';
    else if (form.title.length > 80) e.title = 'Keep titles under 80 characters.';
    if (!form.category) e.category = 'Pick a category — buyers filter by these.';
    if (form.category === 'Textbooks' && !form.courseCode.trim())
      e.courseCode = 'Add the course code (e.g. MT-115) so classmates find it.';
    else if (form.courseCode && !/^[A-Za-z]{2,3}-?\d{3}$/.test(form.courseCode.trim()))
      e.courseCode = 'Format like MT-115 or CS316.';
    if (!form.condition) e.condition = 'Pick a condition.';
    if (!form.price) e.price = 'Add a price between Rs 50 and Rs 500,000.';
    else {
      const n = parseInt(form.price);
      if (isNaN(n) || n < 50) e.price = 'Price seems too low — minimum Rs 50.';
      else if (n > 500000) e.price = 'Price exceeds Rs 500,000 cap.';
    }
    if (form.description && form.description.length > 600) e.description = 'Keep description under 600 characters.';
    if (!form.pickup) e.pickup = 'Pick a pickup spot on campus.';
    return e;
  }, [form]);

  const showErr = (k) => (touched[k] || submitTried[step]) && errors[k];
  const showOk = (k) => touched[k] && !errors[k] && !!form[k];

  const stepFields = {
    1: ['photos'],
    2: ['title', 'category', ...(form.category === 'Textbooks' ? ['courseCode'] : []), 'condition', 'price'],
    3: ['pickup'],
  };

  const stepValid = (s) => stepFields[s].every(k => !errors[k]);

  const next = () => {
    setSubmitTried(t => ({ ...t, [step]: true }));
    const tNew = { ...touched };
    stepFields[step].forEach(k => { tNew[k] = true; });
    setTouched(tNew);
    if (stepValid(step)) setStep(s => Math.min(3, s + 1));
  };

  const back = () => {
    if (step === 1) navigate(-1);
    else setStep(s => s - 1);
  };

  const publish = async () => {
    setSubmitTried({ 1: true, 2: true, 3: true });
    if (!stepValid(1) || !stepValid(2) || !stepValid(3)) return;

    setSubmitting(true);
    setServerError(null);
    try {
      const fd = new FormData();
      form.photos.forEach(f => fd.append('photos', f));
      fd.append('title', form.title.trim());
      fd.append('category', form.category);
      fd.append('condition', form.condition);
      fd.append('price', form.price);
      fd.append('pickup', form.pickup);
      fd.append('moveOut', form.moveOut);
      fd.append('openOffers', form.openOffers);
      if (form.courseCode) fd.append('courseCode', form.courseCode.trim().toUpperCase());
      if (form.description) fd.append('description', form.description.trim());

      await api.post('/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/profile');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to publish. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="view">
      <TopBar onBack={back} title={`Post listing · ${step}/3`} right={<div style={{ width: 44 }} />} />

      <div className="stepper">
        {[{ n: 1, lbl: 'Photos' }, { n: 2, lbl: 'Details' }, { n: 3, lbl: 'Pickup' }].map(s => (
          <div key={s.n} className={`step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
            <div className="lbl">
              <span className="num">{step > s.n ? '✓' : s.n}</span>
              {s.lbl}
            </div>
            <div className="bar"><div className="fill" /></div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="form-section">
          <h2>Add photos</h2>
          <p className="sub">First photo is the cover. {form.photos.length}/6 added.</p>

          <ImageUpload
            files={form.photos}
            onChange={files => { setField('photos', files); setTouched(t => ({ ...t, photos: true })); }}
            max={6}
          />

          {showErr('photos') && (
            <div className="err" style={{ marginTop: 12 }}>
              <Warning style={{ color: 'var(--rose)' }} /> {errors.photos}
            </div>
          )}
          {form.photos.length > 0 && !errors.photos && (
            <div className="ok" style={{ marginTop: 12 }}>
              <CheckCirc /> Looking good — clear photos sell faster.
            </div>
          )}

          <div style={{ marginTop: 18, padding: 12, background: 'var(--teal-50)', borderRadius: 12, border: '1px solid var(--teal-100)', display: 'flex', gap: 10 }}>
            <Sparkle style={{ width: 18, height: 18, color: 'var(--teal-700)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--teal-900)', lineHeight: 1.5 }}>
              <strong>Tip:</strong> Take photos in daylight, on a clean surface. Show any wear up close so buyers know what to expect.
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-section">
          <h2>Tell buyers about it</h2>
          <p className="sub">Be specific — clear titles get 3× more saves.</p>

          <div className={`field ${showErr('title') ? 'error' : showOk('title') ? 'success' : ''}`}>
            <label>Title <span className="req">*</span></label>
            <input
              className="input"
              placeholder="e.g. Calculus textbook (Stewart, 8th ed.)"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              onBlur={() => blur('title')}
              maxLength={80}
            />
            {showErr('title') ? (
              <div className="err"><Warning style={{ color: 'var(--rose)' }} /> {errors.title}</div>
            ) : (
              <div className="hint">
                <span style={{ flex: 1 }}>Be specific: include brand, model, edition.</span>
                <span className={`counter ${form.title.length > 70 ? 'warn' : ''}`}>{form.title.length}/80</span>
              </div>
            )}
          </div>

          <div className={`field ${showErr('category') ? 'error' : ''}`}>
            <label>Category <span className="req">*</span></label>
            <div className="cat-grid" style={{ padding: 0, gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {CAT_TILES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`cat-tile ${form.category === c.id ? 'active' : ''}`}
                  style={{ minHeight: 84 }}
                  onClick={() => { setField('category', c.id); blur('category'); }}
                >
                  <span className="ico" style={{ fontSize: 22 }}>{c.emoji || '📦'}</span>
                  <span style={{ fontSize: 11.5 }}>{c.label}</span>
                </button>
              ))}
            </div>
            {showErr('category') && <div className="err"><Warning style={{ color: 'var(--rose)' }} /> {errors.category}</div>}
          </div>

          {form.category === 'Textbooks' && (
            <div className={`field ${showErr('courseCode') ? 'error' : showOk('courseCode') ? 'success' : ''}`}>
              <label>Course code <span className="req">*</span></label>
              <input
                className="input"
                placeholder="MT-115"
                value={form.courseCode}
                onChange={e => setField('courseCode', e.target.value.toUpperCase())}
                onBlur={() => blur('courseCode')}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
              />
              {showErr('courseCode') ? (
                <div className="err"><Warning style={{ color: 'var(--rose)' }} /> {errors.courseCode}</div>
              ) : (
                <div className="hint">Format: <span style={{ fontFamily: 'var(--font-mono)' }}>MT-115</span>, <span style={{ fontFamily: 'var(--font-mono)' }}>CS-316</span>.</div>
              )}
            </div>
          )}

          <div className={`field ${showErr('condition') ? 'error' : ''}`}>
            <label>Condition <span className="req">*</span></label>
            <div className="opt-row">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`opt-pill ${form.condition === c ? 'active' : ''}`}
                  onClick={() => { setField('condition', c); blur('condition'); }}
                >{c}</button>
              ))}
            </div>
            {showErr('condition') && <div className="err"><Warning style={{ color: 'var(--rose)' }} /> {errors.condition}</div>}
          </div>

          <div className={`field ${showErr('price') ? 'error' : showOk('price') ? 'success' : ''}`}>
            <label>Price <span className="req">*</span></label>
            <div className="input-with-icon">
              <span className="leading">Rs</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="1,500"
                value={form.price ? Number(form.price).toLocaleString('en-PK') : ''}
                onChange={e => setField('price', e.target.value.replace(/\D/g, ''))}
                onBlur={() => blur('price')}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            {showErr('price') && <div className="err"><Warning style={{ color: 'var(--rose)' }} /> {errors.price}</div>}
          </div>

          <div className="field">
            <div className="switch-row">
              <div className="info">
                <div className="ttl">Open to offers</div>
                <div className="sub">Buyers can send counter-offers. Recommended.</div>
              </div>
              <button type="button" className={`switch ${form.openOffers ? 'on' : ''}`} onClick={() => setField('openOffers', !form.openOffers)} aria-label="Toggle offers" />
            </div>
          </div>

          <div className="field">
            <div className="switch-row">
              <div className="info">
                <div className="ttl">Tag as Move-Out Sale</div>
                <div className="sub">Highlights your listing for end-of-semester bargains.</div>
              </div>
              <button type="button" className={`switch ${form.moveOut ? 'on' : ''}`} onClick={() => setField('moveOut', !form.moveOut)} aria-label="Toggle move-out" />
            </div>
          </div>

          <div className={`field ${showErr('description') ? 'error' : ''}`}>
            <label>Description</label>
            <textarea
              className="input"
              placeholder="Why are you selling? Any wear or quirks worth mentioning?"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              onBlur={() => blur('description')}
              maxLength={600}
              rows={4}
            />
            <div className="hint">
              <span style={{ flex: 1 }}>Optional, but listings with descriptions sell faster.</span>
              <span className={`counter ${form.description.length > 540 ? 'warn' : ''}`}>{form.description.length}/600</span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-section">
          <h2>How will buyers pick up?</h2>
          <p className="sub">Pick a campus spot you're comfortable meeting at.</p>

          <div className={`field ${showErr('pickup') ? 'error' : ''}`}>
            <label>Pickup location <span className="req">*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PICKUP_LOCATIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setField('pickup', p); blur('pickup'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: 'white',
                    border: `1px solid ${form.pickup === p ? 'var(--teal-700)' : 'var(--line)'}`,
                    borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
                    textAlign: 'left',
                    boxShadow: form.pickup === p ? '0 0 0 2px var(--teal-100)' : 'none',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: form.pickup === p ? 'var(--teal-700)' : 'transparent',
                    border: `2px solid ${form.pickup === p ? 'var(--teal-700)' : 'var(--line)'}`,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    {form.pickup === p && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                  </span>
                  <Pin style={{ width: 16, height: 16, color: 'var(--muted)' }} />
                  <span style={{ flex: 1 }}>{p}</span>
                </button>
              ))}
            </div>
            {showErr('pickup') && <div className="err" style={{ marginTop: 8 }}><Warning style={{ color: 'var(--rose)' }} /> {errors.pickup}</div>}
          </div>

          <div style={{ padding: 12, background: 'white', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', gap: 10, marginTop: 16 }}>
            <Info style={{ width: 18, height: 18, color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              <strong>Safety first.</strong> Meet during daylight in a public spot. Inspect the item before paying.
            </div>
          </div>

          <h4 style={{ margin: '24px 0 10px', fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--muted)' }}>Review before publishing</h4>
          <div className="review-card">
            <div className="row"><span className="k">Title</span><span className="v">{form.title || '—'}</span></div>
            <div className="row"><span className="k">Category</span><span className="v">{form.category || '—'}</span></div>
            {form.courseCode && <div className="row"><span className="k">Course</span><span className="v" style={{ fontFamily: 'var(--font-mono)' }}>{form.courseCode}</span></div>}
            <div className="row"><span className="k">Condition</span><span className="v">{form.condition || '—'}</span></div>
            <div className="row"><span className="k">Price</span><span className="v" style={{ fontFamily: 'var(--font-mono)' }}>{form.price ? fmtPrice(parseInt(form.price)) : '—'}</span></div>
            <div className="row"><span className="k">Photos</span><span className="v">{form.photos.length}</span></div>
            <div className="row"><span className="k">Pickup</span><span className="v" style={{ fontSize: 12 }}>{form.pickup || '—'}</span></div>
            {form.moveOut && <div className="row"><span className="k">Move-Out Sale</span><span className="v" style={{ color: 'var(--coral)' }}>Yes</span></div>}
          </div>

          {serverError && (
            <div className="err" style={{ marginTop: 12 }}>
              <Warning style={{ color: 'var(--rose)' }} /> {serverError}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '12px 20px 24px', display: 'grid', gridTemplateColumns: step === 1 ? '1fr' : '1fr 2fr', gap: 8, position: 'sticky', bottom: 0, background: 'var(--cream)', borderTop: '1px solid var(--line)' }}>
        {step > 1 && (
          <button className="btn btn-secondary" onClick={back}>Back</button>
        )}
        {step < 3 ? (
          <button className="btn btn-primary btn-block" onClick={next}>
            Continue <ArrowRight width={16} height={16} />
          </button>
        ) : (
          <button className="btn btn-primary btn-block" onClick={publish} disabled={submitting}>
            {submitting ? <Spinner size={18} color="white" /> : <><Check width={16} height={16} /> Publish listing</>}
          </button>
        )}
      </div>
    </div>
  );
}
