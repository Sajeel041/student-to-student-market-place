import { useRef, useState } from 'react';
import { Camera, X } from '../ui/Icon';

export default function ImageUpload({ files, onChange, max = 6 }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState(() =>
    files.map(f => ({ file: f, url: URL.createObjectURL(f) }))
  );

  const handleChange = (e) => {
    const selected = Array.from(e.target.files);
    const combined = [...previews];
    for (const f of selected) {
      if (combined.length >= max) break;
      combined.push({ file: f, url: URL.createObjectURL(f) });
    }
    setPreviews(combined);
    onChange(combined.map(p => p.file));
    e.target.value = '';
  };

  const remove = (i) => {
    URL.revokeObjectURL(previews[i].url);
    const next = previews.filter((_, idx) => idx !== i);
    setPreviews(next);
    onChange(next.map(p => p.file));
  };

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {previews.map((p, i) => (
        <div
          key={p.url}
          style={{
            width: 88, height: 88, borderRadius: 12, overflow: 'hidden',
            position: 'relative', flexShrink: 0,
            background: 'var(--cream-2)',
          }}
        >
          <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{
              position: 'absolute', top: 4, right: 4,
              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 999,
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
            aria-label="Remove photo"
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
          {i === 0 && (
            <span style={{
              position: 'absolute', bottom: 4, left: 4,
              background: 'var(--teal-700)', color: 'white',
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
              borderRadius: 4, padding: '2px 5px', letterSpacing: '0.04em',
            }}>COVER</span>
          )}
        </div>
      ))}

      {previews.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: 88, height: 88, borderRadius: 12,
            border: '1.5px dashed var(--line)', background: 'var(--cream-2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, cursor: 'pointer',
            color: 'var(--muted)', fontSize: 11, fontWeight: 600,
            flexShrink: 0,
          }}
          aria-label="Add photos"
        >
          <Camera style={{ width: 22, height: 22 }} />
          Add photo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
