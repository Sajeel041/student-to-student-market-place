import { useState } from 'react';
import { X, Filter } from '../ui/Icon';
import { CAT_TILES, CONDITIONS, PICKUP_LOCATIONS } from '../../utils/constants';

const PICKUP_QUICK = [
  { id: 'FCSE', label: 'CS Faculty' },
  { id: 'FEE', label: 'EE Faculty' },
  { id: 'FME', label: 'ME Faculty' },
  { id: 'Hostel', label: 'Hostel' },
  { id: 'Library', label: 'Library' },
  { id: 'Cafeteria', label: 'Cafeteria' },
];

export default function FilterSheet({ filters, onApply, onClose }) {
  const [local, setLocal] = useState(filters);

  const toggleCat = (c) =>
    setLocal(l => ({
      ...l,
      cats: l.cats.includes(c) ? l.cats.filter(x => x !== c) : [...l.cats, c],
    }));

  const reset = () =>
    setLocal({ cats: [], cond: null, minPrice: '', maxPrice: '', pickup: null, moveOut: false, openOffers: false });

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <h3 style={{ margin: 0 }}>Filters</h3>
          <button className="back-btn" onClick={onClose}><X /></button>
        </div>

        <div className="body">
          <div className="row">
            <div className="label">Category</div>
            <div className="opt-row">
              {CAT_TILES.map(c => (
                <button
                  key={c.id}
                  className={`opt-pill ${local.cats.includes(c.id) ? 'active' : ''}`}
                  onClick={() => toggleCat(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="label">Condition</div>
            <div className="opt-row">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  className={`opt-pill ${local.cond === c ? 'active' : ''}`}
                  onClick={() => setLocal(l => ({ ...l, cond: l.cond === c ? null : c }))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="label">Price range</div>
            <div className="range-row">
              <div className="input-w">
                <span className="pre">Rs</span>
                <input
                  placeholder="Min"
                  inputMode="numeric"
                  value={local.minPrice}
                  onChange={e => setLocal(l => ({ ...l, minPrice: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              <span className="sep">–</span>
              <div className="input-w">
                <span className="pre">Rs</span>
                <input
                  placeholder="Max"
                  inputMode="numeric"
                  value={local.maxPrice}
                  onChange={e => setLocal(l => ({ ...l, maxPrice: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="label">Pickup near</div>
            <div className="opt-row">
              {PICKUP_QUICK.map(p => (
                <button
                  key={p.id}
                  className={`opt-pill ${local.pickup === p.id ? 'active' : ''}`}
                  onClick={() => setLocal(l => ({ ...l, pickup: l.pickup === p.id ? null : p.id }))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="switch-row">
              <div className="info">
                <div className="ttl">Move-Out Sale only</div>
                <div className="sub">Items from graduating students; usually priced to clear.</div>
              </div>
              <button
                className={`switch ${local.moveOut ? 'on' : ''}`}
                onClick={() => setLocal(l => ({ ...l, moveOut: !l.moveOut }))}
                aria-label="Toggle move-out filter"
              />
            </div>
          </div>

          <div className="row">
            <div className="switch-row">
              <div className="info">
                <div className="ttl">Open to offers</div>
                <div className="sub">Sellers who accept counter-offers.</div>
              </div>
              <button
                className={`switch ${local.openOffers ? 'on' : ''}`}
                onClick={() => setLocal(l => ({ ...l, openOffers: !l.openOffers }))}
                aria-label="Toggle offers filter"
              />
            </div>
          </div>
        </div>

        <div className="sheet-foot">
          <button className="btn btn-secondary btn-block" onClick={reset}>Reset</button>
          <button className="btn btn-primary btn-block" onClick={() => onApply(local)}>Show results</button>
        </div>
      </div>
    </div>
  );
}
